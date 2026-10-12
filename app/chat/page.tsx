import { MessageCircle } from 'lucide-react';

export default function ChatPage() {
  return (
    <>
      <h1 className="page-title">Chat</h1>
      <p className="page-sub">Ngobrol bareng pendengar lain</p>
      <div className="soon glass-soft">
        <MessageCircle size={44} color="var(--accent)" />
        <h3>Segera hadir</h3>
        <p>Fitur chat dan komentar diaktifkan di fase 2, bersama login Firebase.</p>
      </div>
    </>
  );
}
