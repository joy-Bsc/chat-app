import { useDispatch, useSelector } from "react-redux";
import ChatItem from "./ChatItem";
import { conversationsApi, useGetConversationsQuery } from "../../features/conversations/conversationsApi";
import Error from './../ui/Error';
import moment from "moment";
import getPartnerInfo from "../../utils/getPartnerInfo";
import gravatarUrl from "gravatar-url";
import { Link } from "react-router-dom";
import InfiniteScroll from "react-infinite-scroll-component";
import { useEffect, useState } from "react";


export default function ChatItems() {
    const {user} = useSelector((state) => state.auth) || {};
    const {email} = user || {};
    const {data , isLoading,isError,error} = useGetConversationsQuery(email)|| {};
    const {data:conversations,totalCount} = data || {};
    const [page,setPage] = useState(1);
    const [hasMore,setHasMore] = useState(true);
    const dispatch = useDispatch();

    const fetchMore = () => {
        setPage((prevPage) => prevPage + 1);    
    }
    
    useEffect(() => {
        console.log(page);

        if (page > 1) {
            console.log(`Dispatching getMoreConversations for page ${page}`);
            dispatch(conversationsApi.endpoints.getMoreConversations.initiate({ email, page }))
                .unwrap()
               
        }
    }, [page, dispatch, email]);

   

    useEffect(() => {
        if(totalCount>0){
            const more = Math.ceil(totalCount/8)>page;
            setHasMore(more);
        }
    },[totalCount,page]);


    //decide what to render
    let content = null;
    if(isLoading){
        content = <li className="mt-2 text-center">Loading...</li>
    }else if(!isLoading && isError){
        content = <li className="mt-2 text-center text-red-500"><Error message={error?.data}/></li>
    }else if(!isLoading && !isError && conversations.length === 0){
        content = <li className="mt-2 text-center">No conversations found</li>
    }

    else if(!isLoading && !isError && conversations.length > 0){
        content = (
            <InfiniteScroll
            dataLength={conversations.length} 
            next={fetchMore}
            hasMore={hasMore}
            loader={<h4>Loading...</h4>}
            height={window.innerHeight - 129}
            >
                {conversations.map((conversation) => {
            
            const {id,message,timestamp} = conversation;
            const {email} = user || {};

            const {name,email:partnerEmail} = getPartnerInfo(conversation.users,email);

            return(
                <li key={id}>
                    <Link to={`/inbox/${id}`}>
                <ChatItem
                    avatar={gravatarUrl(partnerEmail,{size:80})}
                    name={name}
                    lastMessage={message}
                    lastTime={moment(timestamp).fromNow()}
                />
                </Link>
            </li>
            )
        })
    }
    </InfiniteScroll>
    );
    }
            
    return (
        <ul>
            {content}
        </ul>
    );
}
