import { useState } from "react";
import LandingChatUI from "../QueryBot/chat/ui/LandingChatUI";
import { Message } from "../QueryBot/querybot-utils";
import { Button } from "../ui/button";
import ChatInput from "./ChatInput";
import MessageContainer from "../QueryBot/chat/MessageContainer";
import { v4 as uuidv4 } from "uuid";
import { MarkdownComponents } from "../QueryBot/chat/MarkdowComponents";
import { Plus } from "lucide-react";
import { useClientContext } from "@/contexts/ClientContext";
import getCookie from "@/utils/cookieUtils";
import ConversationHistoryList from "./ConversationHistoryList";
import auth_axios from "@/api/axios";
import { Separator } from "../ui/separator";
import InputOutputLogs from "./InputOutputLogs";

const NonprodAgent = () => {
  const [messages, setMessages] = useState<{
    id: string;
    chats: Message[];
  }>({
    id: "",
    chats: [],
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"chat-ui" | "conversation-history">(
    "chat-ui"
  );
  const [historyView, setHistoryView] = useState<
    "conversation" | "input_output"
  >("conversation");

  const { clientID } = useClientContext();

  async function sendMessage() {
    if (!input.trim()) return;
    let conv_id = "";
    if (messages.id == "") {
      conv_id = uuidv4();
      setMessages((prev) => ({
        ...prev,
        id: conv_id,
      }));
    }
    const queryID = uuidv4();
    const newMessage: Message = {
      id: queryID,
      role: "user",
      content: input,
    };

    const assistantId = uuidv4();
    const assistantsMessage: Message = {
      id: assistantId,
      role: "assistant",
      content: "",
    };

    setMessages((prev) => ({
      ...prev,
      chats: [...prev.chats, newMessage, assistantsMessage],
    }));

    const userInput = input;
    setInput("");
    setLoading(true);

    try {
      const response = await fetch(
        `${
          import.meta.env.REACT_APP_API_BASE_URL
        }as-chat/automation/?client=${clientID}&erp=SAP&stream=${true} `,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${getCookie("id_token")}`,
          },
          body: JSON.stringify({
            query: userInput,
            session: conv_id == "" ? messages?.id : conv_id,
          }),
        }
      );

      if (!response.ok)
        throw new Error(`HTTP error! status: ${response.status}`);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Response body is null");

      const decoder = new TextDecoder();
      let assistantContent = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        assistantContent += chunk;

        setMessages((prev) => ({
          ...prev,
          chats: prev.chats.map((msg) =>
            msg.id === assistantId ? { ...msg, content: assistantContent } : msg
          ),
        }));
      }
    } catch (error) {
      console.error("Error:", error);
      setMessages((prev) => ({
        ...prev,
        chats: prev.chats.map((msg) =>
          msg.id === assistantId
            ? { ...msg, content: "⚠️ Failed to get response from the server." }
            : msg
        ),
      }));
    } finally {
      setLoading(false);
    }
  }

  async function toggleChat(session_id: string) {
    const response = await auth_axios().get(
      `/as-chat/session/${session_id}/chat-history/`
    );
    const result = await response.data;
    setView("conversation-history");
    setMessages({
      id: session_id,
      chats: result.map((msg: { message: string; role: string }) => ({
        role: msg.role,
        content: msg.message,
      })),
    });
  }

  return (
    <div className="h-[calc(100vh-88px)] overflow-hidden flex flex-row w-full">
      <div className="w-[22vw] bg-[#f3f5f6] py-10 px-6 space-y-6">
        <Button
          className=" w-full h-9 py-3.5 pl-2 pr-3 bg-[#007cb0] rounded justify-center items-center gap-2 inline-flex text-white text-xs font-bold font-['Open Sans'] leading-none"
          onClick={() => {
            setMessages({ id: uuidv4(), chats: [] });
            setView("chat-ui");
          }}
        >
          <Plus fill="white" className="size-4" />
          New Chat
        </Button>

        <div className="px-1">
          <h4 className="text-sm text-neutral-600 pl-1.5 font-semibold">
            Conversations
          </h4>
          <Separator orientation="horizontal" className="mt-2" />
          <ConversationHistoryList toggleChat={toggleChat} />
        </div>
      </div>
      <div className="w-full">
        {/* <div
          className={`flex-shrink-0 pt-3 pb-2 ${
            view != "conversation-history" &&
            "border-b border-gray-100 shadow-sm"
          }`}
        >
          <div className="flex justify-end mr-3.5 ">
            {view != "conversation-history" && (
              <Button
                size={"sm"}
                className="h-8 text-xs text-neutral-700 hover:text-[#007cb0]"
                variant={"link"}
                onClick={() => setView("conversation-history")}
              >
                History
              </Button>
            )}
          </div>
        </div>
        {view == "conversation-history" && (
          <div className="w-full h-full px-4">
            <Button
              variant={"link"}
              className="h-6 -ml-4 mb-2 text-xs text-neutral-400 hover:text-[#007cb0] "
              onClick={() => setView("chat-ui")}
            >
              <ArrowLeft className="size-3.5 mr-0.5" />
              Back
            </Button>
            <ConversationHistoryTable
              endpoint=""
              toggleChat={() => null}
              height="55vh"
            />
          </div>
        )} */}
        {messages.chats.length === 0 ? (
          <div className=" h-full w-full flex items-center justify-center">
            <LandingChatUI>
              <ChatInput
                input={input}
                setInput={setInput}
                sendMessage={sendMessage}
                loading={loading}
              />
            </LandingChatUI>
          </div>
        ) : (
          <div className="h-[97%] flex flex-col w-full ">
            {view == "conversation-history" && (
              <div className="w-full pt-6 pb-3.5 px-4 flex justify-end border-b border-gray-100 shadow-sm">
                <div className={` flex gap-2 text-[13px] text-neutral-600 `}>
                  <button
                    onClick={() => setHistoryView("conversation")}
                    className={` py-1 px-2 rounded-[4px]  ${
                      historyView === "conversation"
                        ? "bg-[#007cb0] text-white shadow-sm"
                        : "bg-[#f3f5f6]"
                    } `}
                  >
                    Conversation History
                  </button>
                  <Separator
                    orientation="vertical"
                    className="h-full bg-gray-200"
                  />
                  <button
                    onClick={() => setHistoryView("input_output")}
                    className={` py-1 px-2 rounded-[4px]  ${
                      historyView === "input_output"
                        ? "bg-[#007cb0] text-white shadow-sm"
                        : "bg-[#f3f5f6]"
                    } `}
                  >
                    Resolution Input & Logs
                  </button>
                </div>
              </div>
            )}
            {historyView === "input_output" ? (
              <InputOutputLogs />
            ) : (
              <>
                <MessageContainer
                  messages={messages}
                  loading={loading}
                  MarkdownComponents={MarkdownComponents}
                />
                <ChatInput
                  input={input}
                  setInput={setInput}
                  sendMessage={sendMessage}
                  loading={loading}
                />
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default NonprodAgent;
