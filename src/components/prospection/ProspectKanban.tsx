import { Prospect } from '@/types/prospect';
import React from 'react';
import nocodbService from '@/services/nocodbService';
import { mapProspectStatusToNoco } from '@/lib/prospectStatus';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Mail, Phone, Edit, Trash2 } from 'lucide-react';

interface ProspectKanbanProps {
  prospects: Prospect[];
  setProspects: React.Dispatch<React.SetStateAction<Prospect[]>>;
  onEdit: (prospect: Prospect) => void;
  onDelete: (id: string) => void;
}

const statuses = [
  { id: 'Nouveau', title: 'Nouveau', color: 'bg-gray-100 dark:bg-gray-800' },
  { id: 'En contact', title: 'En contact', color: 'bg-blue-100 dark:bg-blue-900/30' },
  { id: 'En discussion', title: 'En discussion', color: 'bg-yellow-100 dark:bg-yellow-900/30' },
  { id: 'Proposition', title: 'Proposition', color: 'bg-purple-100 dark:bg-purple-900/30' },
  { id: 'Converti', title: 'Converti', color: 'bg-green-100 dark:bg-green-900/30' },
];

const ProspectKanban: React.FC<ProspectKanbanProps> = ({ prospects, setProspects, onEdit, onDelete }) => {
  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, id: string) => {
    event.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = async (event: React.DragEvent<HTMLDivElement>, status: string) => {
    event.preventDefault();
    const id = event.dataTransfer.getData('text/plain');
    setProspects(prev => prev.map(p => (p.id === id ? { ...p, status } : p)));
    try {
      await nocodbService.updateProspect(id, { status: mapProspectStatusToNoco(status) });
    } catch (error) {
      console.error('Erreur mise à jour prospect:', error);
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      {statuses.map(column => (
        <div
          key={column.id}
          onDragOver={handleDragOver}
          onDrop={e => handleDrop(e, column.id)}
          className={`${column.color} rounded-lg p-4`}
        >
          <h3 className="font-semibold mb-4 flex items-center justify-between">
            {column.title}
            <Badge variant="secondary" className="ml-2">
              {prospects.filter(p => p.status === column.id).length}
            </Badge>
          </h3>
          <div className="space-y-3">
            {prospects
              .filter(p => p.status === column.id)
              .map(p => (
                <Card
                  key={p.id}
                  className="hover:shadow-md transition-shadow cursor-move"
                  draggable
                  onDragStart={e => handleDragStart(e, p.id)}
                >
                  <CardContent className="p-4 space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium">{p.name}</h4>
                        {p.company && (
                          <p className="text-sm text-muted-foreground">{p.company}</p>
                        )}
                        {p.email && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Mail className="w-3 h-3" />
                            {p.email}
                          </p>
                        )}
                        {p.phone && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                            <Phone className="w-3 h-3" />
                            {p.phone}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={e => {
                            e.stopPropagation();
                            onEdit(p);
                          }}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={e => {
                            e.stopPropagation();
                            onDelete(p.id);
                          }}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    {(p.email || p.phone) && (
                      <div className="flex gap-2 pt-2 flex-wrap" onClick={e => e.stopPropagation()}>
                        {p.email && (
                          <Button size="sm" className="gap-2" asChild>
                            <a href={`mailto:${p.email}`}>
                              <Mail className="w-4 h-4" />
                              Email
                            </a>
                          </Button>
                        )}
                        {p.phone && (
                          <Button size="sm" variant="secondary" className="gap-2" asChild>
                            <a href={`tel:${p.phone}`}>
                              <Phone className="w-4 h-4" />
                              Appeler
                            </a>
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProspectKanban;
