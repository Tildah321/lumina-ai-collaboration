import { useState, useEffect } from 'react';
import { Bell, Check, Trash2, Clock, BellOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

interface Notification {
  id: string;
  webhook_id: string;
  title: string;
  message: string;
  data: any;
  read: boolean;
  created_at: string;
  webhooks?: {
    id: string;
    name: string;
  };
}

export const NotificationBell = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
    
    loadNotifications();

    // Subscribe to real-time updates
    const channel = supabase
      .channel('notifications_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          loadNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;

    try {
      setLoading(true);

      const { data: notificationsData, error: notifError } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);

      if (notifError) throw notifError;

      const webhookIds = [
        ...new Set(notificationsData?.map((n) => n.webhook_id).filter(Boolean) || []),
      ];
      
      const { data: webhooksData } = await supabase
        .from('webhooks')
        .select('id, name')
        .in('id', webhookIds);

      const webhooksMap = new Map(webhooksData?.map((w) => [w.id, w]) || []);
      
      const enrichedNotifications: Notification[] =
        notificationsData?.map((notif) => ({
          id: notif.id,
          webhook_id: notif.webhook_id,
          title: notif.title,
          message: notif.message,
          data: notif.data,
          read: notif.read,
          created_at: notif.created_at,
          webhooks: notif.webhook_id ? webhooksMap.get(notif.webhook_id) : undefined,
        })) || [];

      setNotifications(enrichedNotifications);
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setNotifications(
        notifications.map((notif) =>
          notif.id === notificationId ? { ...notif, read: true } : notif
        )
      );
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user?.id)
        .eq('read', false);

      if (error) throw error;

      setNotifications(notifications.map((notif) => ({ ...notif, read: true })));
      
      toast({
        title: "Notifications marquées",
        description: "Toutes les notifications ont été marquées comme lues",
      });
    } catch (error) {
      console.error('Erreur lors du marquage global:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId)
        .eq('user_id', user?.id);

      if (error) throw error;

      setNotifications(notifications.filter((notif) => notif.id !== notificationId));
      
      toast({
        title: "Notification supprimée",
        description: "La notification a été supprimée",
      });
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la notification",
        variant: "destructive",
      });
    }
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  if (!user) {
    return null;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="flex items-center justify-between p-4 border-b">
          <h3 className="font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Button variant="ghost" size="sm" onClick={markAllAsRead}>
              <Check className="w-4 h-4 mr-2" />
              Tout marquer lu
            </Button>
          )}
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            Chargement...
          </div>
        ) : notifications.length === 0 ? (
          <div className="p-8 text-center">
            <BellOff className="w-12 h-12 mx-auto mb-3 text-muted-foreground/50" />
            <p className="text-sm text-muted-foreground">Aucune notification</p>
          </div>
        ) : (
          <ScrollArea className="h-[400px]">
            <div className="divide-y">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`p-4 hover:bg-muted/50 transition-colors ${
                    !notification.read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-medium">{notification.title}</h4>
                        {!notification.read && (
                          <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
                        )}
                      </div>

                      {notification.message && (
                        <p className="text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                      )}

                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="w-3 h-3" />
                        {formatDistanceToNow(new Date(notification.created_at), {
                          addSuffix: true,
                          locale: fr,
                        })}
                      </div>

                      {notification.webhooks?.name && (
                        <Badge variant="outline" className="text-xs">
                          {notification.webhooks.name}
                        </Badge>
                      )}

                      {notification.data && Object.keys(notification.data).length > 0 && (
                        <details className="text-xs mt-2">
                          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                            Voir les données
                          </summary>
                          <div className="mt-2 p-2 bg-muted rounded space-y-1">
                            {Object.entries(notification.data).map(([key, value]) => (
                              <div key={key} className="flex gap-2">
                                <span className="font-medium text-foreground">{key}:</span>
                                <span className="text-muted-foreground break-all">
                                  {typeof value === 'object' && value !== null
                                    ? JSON.stringify(value, null, 2)
                                    : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>

                    <div className="flex gap-1">
                      {!notification.read && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => markAsRead(notification.id)}
                          className="h-8 w-8"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteNotification(notification.id)}
                        className="h-8 w-8 text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </PopoverContent>
    </Popover>
  );
};
