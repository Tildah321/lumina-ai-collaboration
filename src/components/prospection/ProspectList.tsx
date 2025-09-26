import { useState } from 'react';
import { Prospect } from '@/types/prospect';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Mail, 
  Phone, 
  Globe, 
  Calendar, 
  Search, 
  Edit, 
  Trash2, 
  Plus,
  Filter
} from 'lucide-react';

interface ProspectListProps {
  prospects: Prospect[];
  isLoading: boolean;
  onEdit: (prospect: Prospect) => void;
  onDelete: (id: string) => void;
  onCreateSpace: (prospect: Prospect) => void;
  onLoadMore?: () => void;
  hasMore?: boolean;
}

const statusColors = {
  'Nouveau': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
  'En contact': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  'En discussion': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
  'Proposition': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  'Converti': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
};

const ProspectList = ({ 
  prospects, 
  isLoading, 
  onEdit, 
  onDelete, 
  onCreateSpace,
  onLoadMore,
  hasMore 
}: ProspectListProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filteredProspects = prospects.filter(prospect => {
    const matchesSearch = 
      prospect.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prospect.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
      prospect.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || prospect.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  if (isLoading && prospects.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Chargement des prospects...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filtres */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Rechercher par nom, entreprise ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-48">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue placeholder="Filtrer par statut" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Tous les statuts</SelectItem>
            <SelectItem value="Nouveau">Nouveau</SelectItem>
            <SelectItem value="En contact">En contact</SelectItem>
            <SelectItem value="En discussion">En discussion</SelectItem>
            <SelectItem value="Proposition">Proposition</SelectItem>
            <SelectItem value="Converti">Converti</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Statistiques */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
        {Object.entries(
          prospects.reduce((acc, prospect) => {
            acc[prospect.status] = (acc[prospect.status] || 0) + 1;
            return acc;
          }, {} as Record<string, number>)
        ).map(([status, count]) => (
          <Card key={status} className="text-center">
            <CardContent className="p-4">
              <Badge className={statusColors[status as keyof typeof statusColors]} variant="secondary">
                {status}
              </Badge>
              <p className="text-2xl font-bold mt-2">{count}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Liste des prospects */}
      {filteredProspects.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center">
            <div className="text-muted-foreground">
              {prospects.length === 0 ? (
                <>
                  <Plus className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Aucun prospect trouvé</h3>
                  <p>Commencez par créer votre premier prospect</p>
                </>
              ) : (
                <>
                  <Search className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <h3 className="text-lg font-semibold mb-2">Aucun résultat</h3>
                  <p>Aucun prospect ne correspond à vos critères de recherche</p>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredProspects.map((prospect) => (
            <Card key={prospect.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{prospect.name}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">{prospect.company}</p>
                  </div>
                  <Badge className={statusColors[prospect.status as keyof typeof statusColors]} variant="secondary">
                    {prospect.status}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                  {prospect.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="w-4 h-4" />
                      <a 
                        href={`mailto:${prospect.email}`}
                        className="hover:text-primary transition-colors truncate"
                      >
                        {prospect.email}
                      </a>
                    </div>
                  )}
                  {prospect.phone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="w-4 h-4" />
                      <a 
                        href={`tel:${prospect.phone}`}
                        className="hover:text-primary transition-colors"
                      >
                        {prospect.phone}
                      </a>
                    </div>
                  )}
                  {prospect.website && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="w-4 h-4" />
                      <a 
                        href={prospect.website.startsWith('http') ? prospect.website : `https://${prospect.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-primary transition-colors truncate"
                      >
                        {prospect.website}
                      </a>
                    </div>
                  )}
                  {prospect.lastContact && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>Dernier contact: {new Date(prospect.lastContact).toLocaleDateString()}</span>
                    </div>
                  )}
                </div>
                
                <div className="flex gap-2 pt-3 border-t flex-wrap">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onEdit(prospect)}
                    className="gap-2"
                  >
                    <Edit className="w-4 h-4" />
                    Modifier
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onCreateSpace(prospect)}
                    className="gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Créer un espace
                  </Button>
                  {prospect.email && (
                    <Button size="sm" variant="outline" asChild className="gap-2">
                      <a href={`mailto:${prospect.email}`}>
                        <Mail className="w-4 h-4" />
                        Contacter
                      </a>
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onDelete(prospect.id)}
                    className="gap-2 text-destructive hover:text-destructive"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Charger plus */}
      {hasMore && (
        <div className="text-center pt-4">
          <Button 
            variant="outline" 
            onClick={onLoadMore}
            disabled={isLoading}
          >
            {isLoading ? 'Chargement...' : 'Charger plus de prospects'}
          </Button>
        </div>
      )}

      {prospects.length > 0 && (
        <div className="text-center text-sm text-muted-foreground">
          {filteredProspects.length} prospect(s) affiché(s) sur {prospects.length} total
        </div>
      )}
    </div>
  );
};

export default ProspectList;