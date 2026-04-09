import mongoose, { Document, Schema } from 'mongoose';

export interface IMessage extends Document {
  conversationKey: string;
  sessionId?: mongoose.Types.ObjectId;
  fromUserId: mongoose.Types.ObjectId;
  toUserId: mongoose.Types.ObjectId;
  text: string;
  read: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const MessageSchema = new Schema<IMessage>(
  {
    conversationKey: { type: String, required: true, trim: true, index: true },
    sessionId: { type: Schema.Types.ObjectId, ref: 'Session', default: undefined, index: true },
    fromUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    toUserId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    text: { type: String, required: true, trim: true, maxlength: 2000 },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

MessageSchema.index({ conversationKey: 1, createdAt: 1 });

if (process.env.NODE_ENV !== 'production' && mongoose.models.Message) {
  delete mongoose.models.Message;
}

const MessageModel = mongoose.models.Message || mongoose.model<IMessage>('Message', MessageSchema);

export default MessageModel;
