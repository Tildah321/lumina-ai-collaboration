import { Prospect } from '@/types/prospect';
import React from 'react';
import nocodbService from '@/services/nocodbService';
import { mapProspectStatusToNoco } from '@/lib/prospectStatus';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Phone, Globe, Calendar } from 'lucide-react';

interface ProspectKanbanProps {
  prospects: Prospect[];
  onUpdateProspect: (id: string, status: string) => void;
  onCreateSpace: (prospect: Prospect) => void;
  onEdit: (prospect: Prospect) => void;
}

const statuses = [
  { id: 'Nouveau', title: 'Nouveau', color: 'bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700' },
  { id: 'En contact', title: 'En contact', color: 'bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800' },
  { id: 'En discussion', title: 'En discussion', color: 'bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800' },
  { id: 'Proposition', title: 'Proposition', color: 'bg-purple-50 dark:bg-purple-950 border border-purple-200 dark:border-purple-800' },
  { id: 'Converti', title: 'Converti', color: 'bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800' },
];

const ProspectKanban: React.FC<ProspectKanbanProps> = ({ prospects, onUpdateProspect, onCreateSpace, onEdit }) => {
  const [draggedId, setDraggedId] = React.useState<string | null>(null);

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, id: string) => {
    setDraggedId(id);
    event.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>, status: string) => {
    event.preventDefault();
    if (draggedId) {
      onUpdateProspect(draggedId, status);
      setDraggedId(null);
    }
  };

  const ensureProtocol = (url: string) =>
    url && (url.startsWith('http://') || url.startsWith('https://')) ? url : `https://${url}`;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-6">
      {statuses.map(column => (
        <div
          key={column.id}
          onDragOver={handleDragOver}
          onDrop={e => handleDrop(e, column.id)}
          className={`${column.color} rounded-xl p-3 lg:p-4 min-h-[600px] transition-all duration-200 hover:shadow-sm`}
        >
          <div className="font-semibold mb-4 flex items-center justify-between sticky top-0 bg-inherit pb-2">
            <span className="text-sm font-medium text-foreground">{column.title}</span>
            <Badge variant="outline" className="text-xs px-2 py-1">
              {prospects.filter(p => p.status === column.id).length}
            </Badge>
          </div>
          <div className="space-y-3">
            {prospects
              .filter(p => p.status === column.id)
              .map(p => (
                <Card
                  key={p.id}
                  className="hover:shadow-lg transition-all duration-200 cursor-move bg-card/95 backdrop-blur-sm border-border/50 hover:border-border group"
                  draggable
                  onDragStart={e => handleDragStart(e, p.id)}
                >
                  <CardContent className="p-3 lg:p-4 space-y-3">
                    <div className="flex items-start">
                      <div className="flex-1 space-y-2">
                        <h4 className="font-semibold text-foreground text-sm leading-tight line-clamp-2">{p.name}</h4>
                        {p.company && (
                          <p className="text-sm text-muted-foreground font-medium bg-muted/50 px-2 py-1 rounded-md inline-block">
                            {p.company}
                          </p>
                        )}
                        <div className="space-y-1">
                          {p.email && (
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <Mail className="w-3 h-3 text-primary" />
                              <span className="truncate">{p.email}</span>
                            </div>
                          )}
                          {p.phone && (
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <Phone className="w-3 h-3 text-primary" />
                              <span>{p.phone}</span>
                            </div>
                          )}
                          {p.website && (
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <Globe className="w-3 h-3 text-primary" />
                              <a
                                href={ensureProtocol(p.website)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline truncate"
                                onClick={e => e.stopPropagation()}
                              >
                                {p.website}
                              </a>
                            </div>
                          )}
                          {p.lastContact && (
                            <div className="text-xs text-muted-foreground flex items-center gap-2">
                              <Calendar className="w-3 h-3 text-primary" />
                              <span>Dernier contact: {new Date(p.lastContact).toLocaleDateString()}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {(p.email || p.phone) && (
                      <div className="flex gap-2 pt-3 border-t border-border/50" onClick={e => e.stopPropagation()}>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2 flex-1 h-8"
                          onClick={e => {
                            e.stopPropagation();
                            onEdit(p);
                          }}
                        >
                          Modifier
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2 flex-1 h-8"
                          onClick={e => {
                            e.stopPropagation();
                            onCreateSpace(p);
                          }}
                        >
                          Espace
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            {prospects.filter(p => p.status === column.id).length === 0 && (
              <div className="text-center text-muted-foreground text-sm py-8 border-2 border-dashed border-border rounded-lg">
                Glissez un prospect ici
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProspectKanban;
