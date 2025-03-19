'use client';

import { useChat } from 'ai/react';
import { FC, ReactNode, useEffect, useRef, useState } from 'react';
import { Message } from 'ai';
import { toast, Toaster } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { ParaCore } from '@getpara/react-sdk';
import {solanaAgentWithPara} from '@/utils/init'
import { activateWalletWeb } from '@/utils/use_wallet';
import { saveUserShare, getUserShare, deleteUserShare } from '@/lib/usershare/actions';

const LoadingSpinner = () => (
  <div className="flex items-center space-x-2 text-gray-400 text-sm">
    <div className="animate-spin rounded-full h-4 w-4 border-2 border-b-transparent border-gray-400"></div>
    <span>AI is thinking...</span>
  </div>
);

interface ToolCall {
  type: string;
  toolCallId: string;
  toolName: string;
  args: Record<string, any>;
}

interface ToolResult {
  toolCallId: string;
  result: Record<string, any>;
}

interface StreamFinish {
  finishReason: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
  };
  isContinued?: boolean;
}

interface ToolInvocation {
  type: string;
  toolName: string;
  args?: Record<string, any>;
  state?: string;
  result?: Record<string, any>;
}

interface ExtendedMessage {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'function';
  content?: string;
  createdAt?: Date;
  toolCalls?: ToolCall[];
  toolResults?: ToolResult[];
  text?: string;
  finish?: StreamFinish;
  toolInvocations?: ToolInvocation[];
}

interface ChatWindowProps {
  endpoint: string;
  emoji: string;
  titleText: string;
  placeholder?: string;
  emptyStateComponent: ReactNode;
  para?:ParaCore;
}

export const ChatWindow: FC<ChatWindowProps> = ({
  endpoint,
  emoji,
  titleText,
  placeholder = "Send a message...",
  emptyStateComponent,
  para
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  
  const { messages: chatMessages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: endpoint,
    onError: (error) => {
      let errorMessage = "An error occurred during chat processing";
      
      console.error("Chat API error:", error);
      
      try {
        // Try to parse error as JSON if it's a string
        if (typeof error.message === 'string') {
          try {
            const parsedError = JSON.parse(error.message);
            errorMessage = parsedError.error || parsedError.message || errorMessage;
          } catch (e) {
            // If parsing fails, use the raw error message
            errorMessage = error.message;
          }
        } else if (error instanceof Response) {
          // If error is a Response object (HTTP error)
          errorMessage = error.statusText 
            ? `Error ${error.status || ''}: ${error.statusText}` 
            : errorMessage;
        } else {
          // Fallback to generic error
          errorMessage = String(error);
        }
      } catch (e) {
        console.error("Error parsing error message:", e);
      }
      
      toast.error(errorMessage);
    },
    onResponse: (response) => {
      if (!response.ok) {
        const statusText = response.statusText ? `: ${response.statusText}` : '';
        toast.error(`HTTP error! Status: ${response.status}${statusText}`);
      }
    },
    onFinish: async (message: any) => {
      try {
        if (!message) {
          console.warn("onFinish called with empty message");
          return;
        }

        setMessages(prevMessages => {
          const updatedMessages = [...prevMessages];
          const lastMessage = updatedMessages[updatedMessages.length - 1];
          
          if (lastMessage) {
            const extendedMessage: ExtendedMessage = {
              id: lastMessage.id,
              role: lastMessage.role,
              content: message.content || lastMessage.content || "",
              createdAt: lastMessage.createdAt,
              toolInvocations: lastMessage.toolInvocations || [],
              toolResults: Array.isArray(message.toolResults) ? message.toolResults : lastMessage.toolResults || [],
              finish: message.finish
            };
            
            return [...updatedMessages.slice(0, -1), extendedMessage];
          }
         
          return updatedMessages;
        });

        // Handle async tool invocations separately
        if (message.toolInvocations && Array.isArray(message.toolInvocations) && message.toolInvocations.length > 0) {
          const processedInvocations = await Promise.all(
            message.toolInvocations.map(async (invocation: ToolInvocation) => {
              if (!invocation || typeof invocation !== 'object') {
                console.warn("Invalid tool invocation:", invocation);
                return null;
              }

              if (invocation.toolName === 'GET_ALL_WALLETS') {
                try {
                  if (!solanaAgentWithPara || !solanaAgentWithPara.methods) {
                    throw new Error("solanaAgentWithPara is not initialized");
                  }
                 
                  const fetchWallets = await para?.fetchWallets();
                  const wallets = fetchWallets?.filter(wallet => wallet.type === 'SOLANA');
                  return {
                    ...invocation,
                    result: { status: 'success', wallets }
                  };
                } catch (error) {
                  console.error("Error in GET_ALL_WALLETS:", error);
                  return {
                    ...invocation,
                    result: { status: 'error', message: (error as Error).message }
                  };
                }
              }
              if (invocation.toolName === '0') {
                try {
                  if (!invocation.result) {
                    throw new Error("Invalid tool invocation result: missing result data");
                  }
                  
                  const result=await saveUserShare(invocation.result.email, invocation.result.userShare);
                  console.log(result);
                  return {
                    ...invocation,
                    result: { 
                      status: 'success', 
                      ...invocation.result 
                    }
                  };
                } catch (error) {
                  console.error('Error saving user share data:', error);
                  return {
                    ...invocation,
                    result: { 
                      status: 'error', 
                      message: (error as Error).message,
                      ...invocation.result 
                    }
                  };
                }
              }
              if (invocation.toolName === 'CLAIM_PARA_PREGEN_WALLET') {
                try {
                  if (!invocation.args || !invocation.args.email) {
                    throw new Error("Missing email in args for CLAIM_PARA_PREGEN_WALLET");
                  }
                  
                  const data = await getUserShare(invocation.args.email);
                  
                  if (!data || !data.userShare) {
                    throw new Error("Invalid user share data retrieved");
                  }
               
                  if (!solanaAgentWithPara || !solanaAgentWithPara.methods) {
                    throw new Error("solanaAgentWithPara is not initialized");
                  }
                  
                  const claim = await solanaAgentWithPara.methods.claimParaPregenWallet(data.userShare, "");
                  
                  // Delete user share data after successful claim
                  await deleteUserShare(invocation.args.email);
                  
                  return {
                    ...invocation,
                    result: { status: 'success', ...claim }
                  };
                    
                } catch (error) {
                  console.error('Error claiming Para pregen wallet:', error);
                  return {
                    ...invocation,
                    result: { 
                      status: 'error', 
                      message: (error as Error).message
                    }
                  };
                }
              }
              if (invocation.toolName === 'USE_WALLET') {
                
                try {
                  if (!invocation.args || !invocation.args.walletId) {
                    throw new Error("Missing walletId in args for USE_WALLET");
                  }
                  
                  // Pass empty object cast to SolanaAgentKit as first parameter since it will be replaced by the bound agent
                  const response = await activateWalletWeb(invocation.args.walletId as string);
                  
                 
                  return {
                    ...invocation,
                    result: { status: 'success', ...response }
                  };
                } catch (error) {
                  console.error("Error using wallet:", error);
                  return {
                    ...invocation,
                    result: { status: 'error', message: (error as Error).message }
                  };
                }
              }
              return invocation;
            })
          );

          // Filter out null values from processedInvocations
          const validInvocations = processedInvocations.filter(Boolean);

          setMessages(prevMessages => {
            try {
              const updatedMessages = [...prevMessages];
              const lastMessage = updatedMessages[updatedMessages.length - 1];
              
              if (lastMessage) {
                const extendedMessage: ExtendedMessage = {
                  ...lastMessage,
                  toolInvocations: validInvocations as ToolInvocation[]
                };
                
                return [...updatedMessages.slice(0, -1), extendedMessage];
              }
              
              return updatedMessages;
            } catch (error) {
              console.error("Error updating messages with tool invocations:", error);
              return prevMessages;
            }
          });
        }
      
      } catch (error) {
        console.error("Error in onFinish:", error);
        toast.error("An error occurred while processing the chat response");
      }
    }
  });

  // Sync our state with chat messages when they change
  useEffect(() => {
    if (chatMessages.length > messages.length) {
      // New message added
      const newMessages = chatMessages.slice(messages.length);
      setMessages(prev => [...prev, ...newMessages as ExtendedMessage[]]);
    }
  }, [chatMessages]);

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      requestAnimationFrame(() => {
        messagesEndRef.current?.scrollIntoView({ 
          behavior: "smooth", 
          block: "end",
        });
      });
    }
  };

  useEffect(() => {
    const timeoutId = setTimeout(scrollToBottom, 100);
    return () => clearTimeout(timeoutId);
  }, [messages]); // Changed from chatMessages to messages

  useEffect(() => {
    if (!isLoading) {
      const timeoutId = setTimeout(scrollToBottom, 100);
      return () => clearTimeout(timeoutId);
    }
  }, [isLoading]);

  const renderMessage = (message: ExtendedMessage) => {
    const isAssistant = message.role === "assistant";
    const messageTime = new Date().toLocaleTimeString();
    const messageContent = message.content || message.text || '';
    
    return (
      <div className={`flex flex-col ${isAssistant ? "items-start" : "items-end"} w-full`}>
        <div className="flex items-center mb-1 text-xs text-gray-400">
          <span>{isAssistant ? "AI Assistant" : "You"}</span>
          <span className="mx-2">•</span>
          <span>{messageTime}</span>
        </div>
        <div className={`rounded-lg px-4 py-3 max-w-[85%] shadow-md ${
          isAssistant 
            ? "bg-gray-700 text-white border border-gray-600" 
            : "bg-blue-600 text-white"
        }`}>
          <div className="prose prose-invert max-w-none">
            <ReactMarkdown>{messageContent}</ReactMarkdown>
          </div>
          
          {message.toolCalls && message.toolCalls.length > 0 && (
            <div className="mt-3 border-t border-gray-600 pt-3">
              <div className="text-sm font-medium text-gray-300">Tools Called:</div>
              {message.toolCalls.map((tool, index) => (
                <div key={`${tool.toolCallId}-${index}`} className="mt-2 bg-gray-800 rounded-md p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-blue-400 font-medium">{tool.toolName}</span>
                    <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded">{tool.toolCallId}</span>
                  </div>
                  <div className="text-xs text-gray-300 mb-1">Arguments:</div>
                  <pre className="text-xs bg-gray-900 p-2 rounded overflow-x-auto">
                    {JSON.stringify(tool.args, null, 2)}
                  </pre>
                  
                  {message.toolResults?.find(result => result.toolCallId === tool.toolCallId) && (
                    <div className="mt-2 border-l-2 border-blue-500 pl-3">
                      <div className="text-xs font-medium text-gray-300">Result:</div>
                      <pre className="mt-1 text-xs bg-gray-900 p-2 rounded overflow-x-auto">
                        {JSON.stringify(
                          message.toolResults.find(
                            result => result.toolCallId === tool.toolCallId
                          )?.result,
                          null,
                          2
                        )}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {message.toolInvocations && message.toolInvocations.length > 0 && (
            <div className="mt-3 border-t border-gray-600 pt-3">
              <div className="text-sm font-medium text-gray-300">Tool Invocations:</div>
              {message.toolInvocations.map((invocation, index) => (
                <div key={index} className="mt-2 bg-gray-800 rounded-md p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-blue-400 font-medium">{invocation.type || 'function_call'}</span>
                    {invocation.toolName && (
                      <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded">
                        {invocation.toolName}
                      </span>
                    )}
                    {invocation.state && (
                      <span className="text-xs text-gray-400 bg-gray-700 px-2 py-0.5 rounded">
                        {invocation.state}
                      </span>
                    )}
                  </div>
                  {invocation.args && (
                    <>
                      <div className="text-xs text-gray-300 mb-1">Arguments:</div>
                      <pre className="text-xs bg-gray-900 p-2 rounded overflow-x-auto">
                        {JSON.stringify(invocation.args, null, 2)}
                      </pre>
                    </>
                  )}
                  {invocation.result  && (
                    <div className="mt-2 border-l-2 border-blue-500 pl-3">
                      <div className="text-xs font-medium text-gray-300">Result:</div>
                      <pre className="mt-1 text-xs bg-gray-900 p-2 rounded overflow-x-auto">
                        {JSON.stringify(invocation.result, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
          
          {message.finish && (
            <div className="mt-2 text-xs text-gray-400 border-t border-gray-600 pt-2 space-y-1">
              <div className="flex items-center gap-2">
                <span>Status: {message.finish.finishReason}</span>
                <span>•</span>
                <span>Total Tokens: {message.finish.usage.promptTokens + message.finish.usage.completionTokens}</span>
              </div>
              {message.finish.isContinued && (
                <div className="text-yellow-400">
                  Note: This response was continued from a previous message
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };

  const messagesContainerRef = useRef<HTMLDivElement>(null);

  return (
    <div className="flex flex-col items-center p-4 md:p-8 rounded bg-[#25252d] w-full h-full overflow-hidden">
      
      <Toaster position="top-center" richColors />
      
      <div className="flex w-full items-center justify-between pb-4 border-b border-gray-600 mb-4">
        <div className="flex items-center">
          
          <div className="mr-2 text-2xl">{emoji}</div>
          <h2 className="text-2xl font-bold">{titleText}</h2>
        </div>
        {isLoading && <LoadingSpinner />}
      </div>

      <div 
        ref={messagesContainerRef}
        className="flex-1 w-full overflow-y-auto mb-4 relative pb-4"
        style={{ maxHeight: 'calc(100vh - 200px)' }}
      >
        {messages.length > 0 ? (
          messages.map((message, i) => (
            <div
              key={`${message.id || i}-${message.role}`}
              className={`flex flex-col mb-4 ${
                message.role === "assistant" ? "items-start" : "items-end"
              }`}
            >
              {renderMessage(message)}
            </div>
          ))
        ) : (
          <div className="flex-1 w-full">{emptyStateComponent}</div>
        )}
        <div ref={messagesEndRef} className="h-1" />
      </div>

      <form onSubmit={handleSubmit} className="flex w-full">
        <input
          className="flex-1 bg-gray-700 text-white rounded-l-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-600"
          value={input}
          placeholder={isLoading ? "Waiting for response..." : placeholder}
          onChange={handleInputChange}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading || !input.trim()}
          className={`px-4 py-2 rounded-r-lg bg-blue-600 text-white font-semibold flex items-center justify-center min-w-[80px]
            ${
              isLoading || !input.trim()
                ? "opacity-50 cursor-not-allowed"
                : "hover:bg-blue-700"
            }`}
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-4 w-4 border-2 border-b-transparent border-white"></div>
          ) : (
            "Send"
          )}
        </button>
      </form>
    </div>
  );
}; 