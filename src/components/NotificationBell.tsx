import { useState } from "react";
import { Bell, X, Check, Info, AlertTriangle, CheckCircle, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

type Notification = {
  id: string;
  title: string;
  message: string;
  type: "info" | "success" | "warning" | "error";
  is_read: boolean;
  created_at: string;
};

const MOCK_NOTIFICATIONS: Notification[] = [
  {
    id: "1",
    title: "Deposit Confirmed",
    message: "Your deposit of $5,000.00 via USDT has been confirmed. Your funds are now available for investment.",
    type: "success",
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 30).toISOString(), // 30 mins ago
  },
  {
    id: "2",
    title: "New Investment Active",
    message: "Your Emerald plan investment is now active. Daily returns will start compounding from tomorrow.",
    type: "info",
    is_read: false,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
  },
  {
    id: "3",
    title: "Market Alert: Gold",
    message: "Gold price (XAU) has increased by 1.2% in the last 4 hours. Portfolio hedge active.",
    type: "warning",
    is_read: true,
    created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
  },
];

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState(MOCK_NOTIFICATIONS);
  
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const deleteNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const getIcon = (type: string) => {
    switch (type) {
      case "success": return <CheckCircle size={16} className="text-success" />;
      case "warning": return <AlertTriangle size={16} className="text-warning" />;
      case "error": return <AlertCircle size={16} className="text-destructive" />;
      default: return <Info size={16} className="text-primary" />;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="relative grid h-10 w-10 place-items-center rounded-full border border-border/60 bg-background/40 transition-colors hover:border-primary/50"
      >
        <Bell size={20} className={unreadCount > 0 ? "animate-wiggle" : ""} />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground ring-2 ring-background">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div 
            className="fixed inset-0 z-40 bg-background/20 backdrop-blur-sm lg:absolute lg:inset-auto lg:-right-4 lg:top-14 lg:w-96 lg:bg-transparent"
            onClick={() => setOpen(false)}
          />
          <div className="fixed inset-x-4 top-20 z-50 rounded-3xl border border-border/80 bg-card/95 p-1 shadow-2xl backdrop-blur-2xl lg:absolute lg:inset-auto lg:-right-4 lg:top-14 lg:w-96">
            <div className="rounded-[calc(1.5rem-4px)] bg-background/50 p-4">
              <div className="flex items-center justify-between border-b border-border/50 pb-3">
                <h3 className="font-display text-lg">Notifications</h3>
                <div className="flex items-center gap-2">
                  {unreadCount > 0 && (
                    <button 
                      onClick={markAllAsRead}
                      className="text-[10px] font-bold uppercase tracking-wider text-primary hover:underline"
                    >
                      Mark all read
                    </button>
                  )}
                  <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="mt-2 max-h-[400px] overflow-y-auto pr-1">
                {notifications.length === 0 ? (
                  <div className="py-10 text-center">
                    <Bell size={32} className="mx-auto mb-3 text-muted-foreground/30" />
                    <p className="text-sm text-muted-foreground">No notifications yet.</p>
                  </div>
                ) : (
                  <div className="space-y-2 py-2">
                    {notifications.map((n) => (
                      <div 
                        key={n.id}
                        className={`group relative flex gap-3 rounded-2xl p-3 transition-colors ${
                          n.is_read ? "bg-background/20 opacity-70" : "bg-primary/5 ring-1 ring-primary/10"
                        }`}
                      >
                        <div className="mt-1 h-fit shrink-0">{getIcon(n.type)}</div>
                        <div className="flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <h4 className={`text-sm font-semibold leading-tight ${n.is_read ? "text-foreground/80" : "text-foreground"}`}>
                              {n.title}
                            </h4>
                            <span className="shrink-0 text-[10px] text-muted-foreground">
                              {formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}
                            </span>
                          </div>
                          <p className="mt-1 text-xs leading-relaxed text-muted-foreground line-clamp-2 group-hover:line-clamp-none">
                            {n.message}
                          </p>
                        </div>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteNotification(n.id);
                          }}
                          className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-background border border-border opacity-0 shadow-sm transition-opacity group-hover:opacity-100 hover:text-destructive"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
