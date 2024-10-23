import { io } from "socket.io-client";
import { apiSlice } from '../api/apiSlice';
import { messagesApi } from '../messages/messagesApi';

const updateOrCreateConversation = (conversations, newConversation) => {
    const { participants, message, timestamp } = newConversation;

    // Check if a conversation already exists between the participants
    const existingConversationIndex = conversations.findIndex(conversation => 
        conversation.participants === participants || 
        conversation.participants === participants.split('-').reverse().join('-')
    );

    if (existingConversationIndex !== -1) {
        // Update the existing conversation with the new message and timestamp
        conversations[existingConversationIndex].message = message;
        conversations[existingConversationIndex].timestamp = timestamp;
    } else {
        // Add the new conversation
        conversations.push(newConversation);
    }

    return conversations;
};

export const conversationsApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getConversations: builder.query({
            query: (email) => ({
                url: `/conversations?participants_like=${email}&_sort=timestamp&_order=desc&_page=1&_limit=8`,
                method: 'GET',    
            }),
            transformResponse(apiResponse,meta){
                const totalCount = meta.response.headers.get('x-total-count');
                //console.log(totalCount);
                return {
                    data:apiResponse,
                    totalCount,
                }
                
            },
            async onCacheEntryAdded(arg, { updateCachedData, cacheDataLoaded, cacheEntryRemoved }) {
                // Create socket connection
                const socket = io("http://localhost:9000/", {
                    reconnectionDelay: 1000,
                    reconnection: true,
                    reconnectionAttempts: 10,
                    transports: ["websocket"],
                    agent: false,
                    upgrade: false,
                    rejectUnauthorized: false,
                });

                socket.on('connect', () => {
                   // console.log('WebSocket connected');
                });

                socket.on('connect_error', (error) => {
                   // console.error('WebSocket connection error:', error);
                });

                try {
                    await cacheDataLoaded;

                    socket.on("conversation", (data) => {
                       // console.log("Conversation data received from socket:", data);

                        updateCachedData((draft) => {
                            const conversation = draft.data.find((c) => c.id === data?.data?.id);
                            if (conversation) {
                                conversation.message = data?.data?.message;
                                conversation.timestamp = data?.data?.timestamp;
                            } else {
                                // Optionally, add new conversation if it doesn't exist
                                
                            }
                        });
                    });
                } catch (error) {
                    console.error("Error during cache entry added:", error);
                }

                // Cleanup function to close the socket connection
                await cacheEntryRemoved;
                socket.close();
            },
        }),

        getMoreConversations: builder.query({
            query: ({ email, page }) => ({
                url: `/conversations?participants_like=${email}&_sort=timestamp&_order=desc&_page=${page}&_limit=8`,
                method: 'GET',
            }),
            async onQueryStarted({ email }, { queryFulfilled, dispatch }) {
                try {
                    const conversations = await queryFulfilled;
                    if (conversations?.data?.length > 0) {
                        // Start conversation cache pessimistically
                        dispatch(apiSlice.util.updateQueryData('getConversations', email, (draft) => {
                            //console.log(JSON.stringify(draft)); // Log the draft object
                            draft.data.push(...conversations.data);
                            draft.totalCount = Number(draft.totalCount);
                        }));
                        // End conversation cache pessimistically
                    }
                } catch (error) {
                    console.error('Error updating conversation cache:', error);
                }
            },
        }),

        getConversation: builder.query({
            query: ({ userEmail, participateEmail }) => ({
                url: `/conversations?participants_like=${userEmail}-${participateEmail}&participants_like=${participateEmail}-${userEmail}`,
                method: 'GET',
            }),
        }),

        addConversation: builder.mutation({
            query: ({ sender, data }) => ({
                url: `/conversations`,
                method: 'POST',
                body: data,
            }),
            async onQueryStarted(arg, { queryFulfilled, dispatch }) {
                // Optimistic cache update starts
                const patchResult1 = dispatch(apiSlice.util.updateQueryData('getConversations', arg.sender, (draft) => {
                    const newConversation = {
                        id: Date.now(), // Temporary ID for optimistic update
                        participants: `${arg.sender}-${arg.data.users.find(user => user.email !== arg.sender).email}`,
                        users: arg.data.users,
                        message: arg.data.message,
                        timestamp: arg.data.timestamp,
                    };
                    draft.unshift(newConversation);
                }));
                // Optimistic cache update ends

                try {
                    const conversation = await queryFulfilled;
                    if (conversation?.data?.id) {
                        // Silent entry to message table
                        const users = arg.data.users;
                        const senderUser = users.find((user) => user.email === arg.sender);
                        const receiverUser = users.find((user) => user.email !== arg.sender);
                        dispatch(messagesApi.endpoints.addMessage.initiate({
                            conversationId: conversation?.data?.id,
                            sender: senderUser,
                            receiver: receiverUser,
                            message: arg.data.message,
                            timestamp: arg.data.timestamp,
                        }));

                        // Update or create conversation
                        dispatch(conversationsApi.util.updateQueryData('getConversations', arg.sender, draft => {
                            updateOrCreateConversation(draft, conversation.data);
                        }));
                    }
                } catch (error) {
                    console.error('Error during query fulfillment:', error);
                    patchResult1.undo();
                }
            },
        }),

        editConversation: builder.mutation({
            query: ({ id, data, sender }) => ({
                url: `/conversations/${id}`,
                method: 'PATCH',
                body: data,
            }),
            async onQueryStarted(arg, { queryFulfilled, dispatch }) {
                // Optimistic cache update starts
                const patchResult1 = dispatch(apiSlice.util.updateQueryData('getConversations', arg.sender, (draft) => {
                    const draftConversation = draft.data.find((c) => c.id === arg.id);
                    if (draftConversation) {
                        draftConversation.message = arg.data.message;
                        draftConversation.timestamp = arg.data.timestamp;
                        // Remove the existing conversation from the array
                        draft.data = draft.data.filter((c) => c.id !== arg.id);
                        // Add the updated conversation to the beginning of the array
                        draft.data.unshift(draftConversation);
                    }
                     
                }));
                 
                // Optimistic cache update ends

                try {
                    const conversation = await queryFulfilled;
                    if (conversation?.data?.id) {
                        // Silent entry to message table
                        const users = arg.data.users;
                        const senderUser = users.find((user) => user.email === arg.sender);
                        const receiverUser = users.find((user) => user.email !== arg.sender);
                        const res=await dispatch(messagesApi.endpoints.addMessage.initiate({
                            conversationId: conversation?.data?.id,
                            sender: senderUser,
                            receiver: receiverUser,
                            message: arg.data.message,
                            timestamp: arg.data.timestamp,
                        })).unwrap();

                        //start message cache pessimistically
                        dispatch(apiSlice.util.updateQueryData('getMessages', res.conversationId.toString(), (draft) => {
                            if (Array.isArray(draft.data)) {
                                draft.data.push(res);
                            } else {
                                draft.data = [res];
                            }
                        }));
                        //end message cache pessimistically

                        // Update or create conversation
                        dispatch(conversationsApi.util.updateQueryData('getConversations', arg.sender, draft => {
                            updateOrCreateConversation(draft.data, conversation.data);
                        }));
                    }
                } catch (error) {
                    console.error('Error during query fulfillment:', error);
                    patchResult1.undo();
                }
            },
        }),
    }),
});

export const { useGetConversationsQuery, useGetConversationQuery, useAddConversationMutation, useEditConversationMutation,useGetMoreConversationsQuery } = conversationsApi;