"use client";

import { useState, useEffect, useRef } from "react";
import { toast } from "@/components/ui/Toast";
import { Send } from "lucide-react";

interface Comment {
  id: string;
  message: string;
  created_at: string;
  user_id: string;
  users: { roll_number: string | null; full_name: string | null } | null;
}

interface DiscussionBoardProps {
  poolId: string;
  currentUserId: string;
}

export default function DiscussionBoard({ poolId, currentUserId }: DiscussionBoardProps) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchComments = async () => {
      const res = await fetch(`/api/pools/${poolId}/comments`);
      if (!res.ok) {
        setLoading(false);
        return;
      }
      const data = await res.json();
      setComments(data);
      setLoading(false);
    };

    fetchComments();
    const interval = setInterval(fetchComments, 4000); // Poll every 4 seconds for simple real-time updates
    return () => clearInterval(interval);
  }, [poolId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [comments]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    const res = await fetch(`/api/pools/${poolId}/comments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: newMessage }),
    });

    setSending(false);
    if (!res.ok) {
      toast("Failed to send message.", "error");
      return;
    }

    const data = await res.json();
    setComments((prev) => [...prev, data]);
    setNewMessage("");
  };

  if (loading) {
    return (
      <div style={{ padding: 20, textAlign: "center", color: "var(--muted)", fontSize: "0.88rem" }}>
        Loading discussion board...
      </div>
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: 380, border: "1.5px solid var(--line)", borderRadius: 14, background: "var(--panel)", overflow: "hidden", marginTop: 20 }}>
      {/* Header */}
      <div style={{ padding: "14px 20px", borderBottom: "1.5px solid var(--line)", background: "var(--panel-soft)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ margin: 0, fontSize: "0.95rem" }}>Trip discussion</h3>
        <span style={{ fontSize: "0.72rem", color: "var(--teal)", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.02em" }}>Members only chat</span>
      </div>

      {/* Messages area */}
      <div style={{ flex: 1, padding: 20, overflowY: "auto", display: "flex", flexDirection: "column", gap: 12 }}>
        {comments.length === 0 ? (
          <div style={{ margin: "auto", textAlign: "center", color: "var(--muted)", fontSize: "0.84rem", padding: "20px 0" }}>
            No messages yet. Send a message to coordinate with the team!
          </div>
        ) : (
          comments.map((c) => {
            const isMe = c.user_id === currentUserId;
            return (
              <div
                key={c.id}
                style={{
                  alignSelf: isMe ? "flex-end" : "flex-start",
                  maxWidth: "75%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4
                }}
              >
                <div style={{
                  padding: "10px 14px",
                  borderRadius: 12,
                  background: isMe ? "var(--teal)" : "var(--panel-soft)",
                  color: isMe ? "#fff" : "var(--ink)",
                  fontSize: "0.88rem",
                  lineHeight: 1.45,
                  border: isMe ? "none" : "1px solid var(--line)"
                }}>
                  {c.message}
                </div>
                <span style={{
                  fontSize: "0.68rem",
                  color: "var(--muted)",
                  alignSelf: isMe ? "flex-end" : "flex-start",
                  display: "flex",
                  gap: 6,
                  fontWeight: 600
                }}>
                  {!isMe && <span>{c.users?.roll_number ?? c.users?.full_name ?? "Member"}</span>}
                  <span>
                    {new Date(c.created_at).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </span>
              </div>
            );
          })
        )}
        <div ref={chatEndRef} />
      </div>

      {/* Input row */}
      <form onSubmit={handleSend} style={{ display: "flex", padding: 12, borderTop: "1.5px solid var(--line)", background: "var(--panel-soft)", gap: 10 }}>
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Write coordination details..."
          style={{ flex: 1, minHeight: 40 }}
          disabled={sending}
        />
        <button
          type="submit"
          className="btn-solid btn btn-sm"
          style={{ width: 40, height: 40, padding: 0, minWidth: 40, background: "var(--teal)", borderColor: "var(--teal)" }}
          disabled={sending || !newMessage.trim()}
          aria-label="Send message"
        >
          <Send size={16} />
        </button>
      </form>
    </div>
  );
}
