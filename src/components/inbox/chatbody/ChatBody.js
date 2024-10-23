// import Blank from "./Blank";
import { useParams } from "react-router-dom";
import ChatHead from "./ChatHead";
import Messages from "./Messages";
import Options from "./Options";
import { useGetMessagesQuery } from "../../../features/messages/messagesApi";
import Error from "../../ui/Error";


export default function ChatBody() {
    const { id } = useParams();
    const {data,isLoading,isError,error} = useGetMessagesQuery(id);
    const {data:messages} = data || {};
    const{totalCount} = data || {};
    
    
    

    //decide waht to render
    let content = null;
    if(isLoading){
        content = <div>Loading...</div>
    }
    else if(!isLoading && isError){
        content = <div><Error messages={error?.data}/></div>
    }
    else if(!isLoading && !isError && messages.length === 0){
        content = <div> no message found</div>
    }
    else if(!isLoading && !isError && messages.length > 0){
        content = (
            <>
                <ChatHead message={messages[0]} />
              
                <Messages messages={messages} totalCount={totalCount} />
            
                <Options info={messages[0]} />
            </>
           
        );
    }

    return (
        <div className="w-full lg:col-span-2 lg:block">
            <div className="w-full grid conversation-row-grid">
                {content}
                {/* <Blank /> */}
            </div>
        </div>
    );
}
