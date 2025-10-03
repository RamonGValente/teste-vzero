import { create } from 'zustand'
import type { Message, UUID, ConversationPeer } from '@/types'
interface ChatState {
  selfId?: UUID; setSelfId:(id?:UUID)=>void;
  peers: ConversationPeer[]; setPeers:(v:ConversationPeer[])=>void;
  activePeerId?: UUID; setActivePeerId:(id?:UUID)=>void;
  messages: Record<UUID, Message[]>; setMessagesFor:(peerId:UUID,list:Message[])=>void; pushMessage:(peerId:UUID,msg:Message)=>void;
}
export const useChatStore = create<ChatState>((set)=> ({
  selfId: undefined, setSelfId:(id)=> set({ selfId:id }),
  peers: [], setPeers:(v)=> set({ peers:v }),
  activePeerId: undefined, setActivePeerId:(id)=> set({ activePeerId:id }),
  messages: {}, setMessagesFor:(peerId,list)=> set((s)=>({ messages:{...s.messages,[peerId]:list} })),
  pushMessage:(peerId,msg)=> set((s)=>({ messages:{...s.messages,[peerId]:[...(s.messages[peerId]??[]), msg]} })),
}))
