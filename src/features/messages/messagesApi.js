import { apiSlice } from '../api/apiSlice';
import { io } from 'socket.io-client';

export const messagesApi = apiSlice.injectEndpoints({
    endpoints: (builder) => ({
        getMessages: builder.query({
            query: (id) => ({
                url: `/messages?conversationId=${id}&_sort=timestamp&_order=desc`,
                method: 'GET',
            }),
            transformResponse(apiResponse, meta) {
                const totalCount = meta.response.headers.get('X-Total-Count');
                //console.log(totalCount);
                
                return {
                    data: apiResponse,
                    totalCount,
                }
            },
           // http://https://chat-app-server-1-z141.onrender.com

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
                    console.log('WebSocket connected');
                });

                socket.on('connect_error', (error) => {
                    console.error('WebSocket connection error:', error);
                });

                try {
                    await cacheDataLoaded;

                    socket.on("message", (data) => {
                        console.log("Message data received from socket:", data);

                        updateCachedData((draft) => {
                            const conversation = draft.data.find((c) => c.id === data?.data?.conversationId);
                            if (conversation) {
                                // Check if the message already exists to avoid duplicates
                                const messageExists = conversation.messages.some((msg) => msg.id === data?.data?.id);
                                if (!messageExists) {
                                    conversation.messages.push(data?.data);
                                    conversation.timestamp = data?.data?.timestamp;
                                }
                            } else {
                                // Optionally, add new conversation if it doesn't exist
                                draft.data.push(data?.data);
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

        getMoreMessages: builder.query({
            query: ({ id, page }) => ({
                url: `/messages?conversationId=${id}&_sort=timestamp&_order=desc&_page=${page}&_limit=9`,
                method: 'GET',
            }),
            async onQueryStarted({ id }, { queryFulfilled, dispatch }) {
                try {
                    const conversations = await queryFulfilled;
                    if (conversations?.data?.length > 0) {
                        // Start conversation cache pessimistically
                        dispatch(apiSlice.util.updateQueryData('getMessages', id, (draft) => {
                           console.log(JSON.stringify(draft)); // Log the draft object
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
        addMessage: builder.mutation({
            query: (data) => ({
                url: `/messages`,
                method: 'POST',
                body: data,
            }),
        }),
    }),
});

export const { useGetMessagesQuery, useAddMessageMutation ,useGetMoreMessagesQuery} = messagesApi;