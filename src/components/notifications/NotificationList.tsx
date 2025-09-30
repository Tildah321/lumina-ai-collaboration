import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Bell, BellOff, Check, Clock, Trash2 } from 'lucide-react';
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
    name: string;
  };
}

export const NotificationList = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
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
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('New notification received:', payload);
            loadNotifications(); // Reload to get webhook name
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user]);

  const loadNotifications = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select(`
          *,
          webhooks (
            name
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setNotifications(data || []);
    } catch (error) {
      console.error('Erreur lors du chargement des notifications:', error);
      toast({
        title: "Erreur",
        description: "Impossible de charger les notifications",
        variant: "destructive"
      });
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

      setNotifications(notifications.map(notif => 
        notif.id === notificationId ? { ...notif, read: true } : notif
      ));
    } catch (error) {
      console.error('Erreur lors du marquage comme lu:', error);
      toast({
        title: "Erreur",
        description: "Impossible de marquer comme lu",
        variant: "destructive"
      });
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

      setNotifications(notifications.map(notif => ({ ...notif, read: true })));
      toast({
        title: "Notifications marquées",
        description: "Toutes les notifications ont été marquées comme lues"
      });
    } catch (error) {
      console.error('Erreur lors du marquage global:', error);
      toast({
        title: "Erreur",
        description: "Impossible de marquer toutes les notifications comme lues",
        variant: "destructive"
      });
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

      setNotifications(notifications.filter(notif => notif.id !== notificationId));
      toast({
        title: "Notification supprimée",
        description: "La notification a été supprimée"
      });
    } catch (error) {
      console.error('Erreur lors de la suppression:', error);
      toast({
        title: "Erreur",
        description: "Impossible de supprimer la notification",
        variant: "destructive"
      });
    }
  };

  const unreadCount = notifications.filter(n => !n.read).length;

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">Notifications</h3>
        </div>
        <div className="text-center py-8">
          <p className="text-muted-foreground">Chargement des notifications...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xl font-semibold">Notifications</h3>
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-xs">
              {unreadCount} non lue{unreadCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" size="sm" onClick={markAllAsRead}>
            <Check className="w-4 h-4 mr-2" />
            Tout marquer comme lu
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <Card className="p-8 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-lg bg-muted/50 flex items-center justify-center">
            <BellOff className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">Aucune notification</h3>
          <p className="text-muted-foreground">
            Les notifications de vos webhooks apparaîtront ici
          </p>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="w-5 h-5" />
              Historique des notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              <div className="space-y-0">
                {notifications.map((notification, index) => (
                  <div
                    key={notification.id}
                    className={`p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors ${
                      !notification.read ? 'bg-blue-50/50 dark:bg-blue-950/20' : ''
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h4 className="font-medium">{notification.title}</h4>
                          {!notification.read && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full" />
                          )}
                        </div>
                        
                        {notification.message && (
                          <p className="text-sm text-muted-foreground">
                            {notification.message}
                          </p>
                        )}
                        
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            {formatDistanceToNow(new Date(notification.created_at), { 
                              addSuffix: true, 
                              locale: fr 
                            })}
                          </span>
                          {notification.webhooks?.name && (
                            <Badge variant="outline" className="text-xs">
                              {notification.webhooks.name}
                            </Badge>
                          )}
                        </div>
                        
                        {notification.data && Object.keys(notification.data).length > 0 && (
                          <details className="text-xs">
                            <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                              Voir les données (JSON)
                            </summary>
                            <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-x-auto">
                              {JSON.stringify(notification.data, null, 2)}
                            </pre>
                          </details>
                        )}
                      </div>
                      
                      <div className="flex gap-1">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                            className="px-2"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteNotification(notification.id)}
                          className="px-2 text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};