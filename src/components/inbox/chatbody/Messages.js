import { useDispatch, useSelector } from "react-redux";
import Message from "./Message";
import InfiniteScroll from "react-infinite-scroll-component";
import { useEffect, useState } from "react";
import { messagesApi } from "../../../features/messages/messagesApi";

export default function Messages({ messages = [],totalCount }) {
    const {user} = useSelector((state) => state.auth) || {};
    const {email} = user || {};
    //const {conversationId} = messages || {};
    //console.log("Messages:", messages);
    //console.log("Total Count:", totalCount);
    console.log("Conversation ID:", messages[0].conversationId);
    const conversationId = messages[0].conversationId;
    const [joinMessage, setJoinMessage] = useState(messages);
    
     
     

    const [page,setPage] = useState(1);
    const [hasMore,setHasMore] = useState(true);
    const dispatch = useDispatch();

    const fetchMore = () => {
        setPage((prevPage) => prevPage + 1);    
    }
    
    useEffect(() => {
        console.log(page);

        if (page > 1) {
            console.log(`Dispatching getMoreMessages for page ${page}`);
            dispatch(messagesApi.endpoints.getMoreMessages.initiate({ id: conversationId, page }))
                .unwrap()
                .then((response) => {
                    console.log("Response:", response);
                    
                   
                    setJoinMessage((prevMessages) => [...prevMessages, ...response]);
                    if (response.length === 0 || joinMessage.length + response.length >= totalCount) {
                        setHasMore(false);
                    }else{
                        setHasMore(true);
                    }
                    
                })
                .catch((error) => {
                    console.error('Error fetching more messages:', error);
                });
        }

    }, [page, dispatch, conversationId, totalCount, joinMessage]);

     
      console.log("Join Message:", joinMessage);
      
     

    useEffect(() => {
        if(totalCount>0){
            const more = Math.ceil(totalCount/9)>page;
            setHasMore(more);
        }
    },[totalCount,page]);
    return (
        <div className="relative w-full h-[calc(100vh_-_197px)] p-6 overflow-y-auto flex flex-col-reverse">
              
                  <InfiniteScroll
                dataLength={messages.length}
                next={fetchMore}
                style={{ display: 'flex', flexDirection: 'column-reverse' }}
                inverse={true}
                hasMore={hasMore}
                loader={<h4>Loading...</h4>}
                height={window.innerHeight - 197}
            >
            <ul className="space-y-2">
                {messages
                .slice()
                .sort((a,b) => a.timestamp - b.timestamp)
                .map((message) => {
                    
                    const {message : lastMessage,id,sender} = message || {};
                    
                    
                    

                    const justify = sender.email !== email ? "start" : "end";
                    return (
              
                <Message key={id}
                justify={justify}
                 message= {lastMessage} />
            
                )}
                )}
                
               
            </ul>
            </InfiniteScroll>
        </div>

    );
}
