export type MessageType = {
  id: string;
  text: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'file';
  fileUrl?: string;
  senderId: string;
  receiverId: string;
  timestamp: Date;
  
  // === Campos de Segurança (Auto-Destrutivas) ===
  viewed: boolean; 
  expiresAt: Date | null;
  isDeleted: boolean; 
  
  // === Campos de Tradução ===
  language: string;
  translatedText?: string;
  isTranslated: boolean;
};