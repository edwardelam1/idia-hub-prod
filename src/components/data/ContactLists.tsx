import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { List, Users, Share, Trash2, RefreshCw } from 'lucide-react';

interface ContactListsProps {
  isOpen: boolean;
  onClose: () => void;
  selectedContacts: string[];
  allContacts: any[];
}

interface ContactList {
  id: string;
  name: string;
  type: 'static' | 'dynamic';
  contactCount: number;
  createdAt: string;
  sharedWith: string[];
  filters?: any;
}

const ContactLists = ({ isOpen, onClose, selectedContacts, allContacts }: ContactListsProps) => {
  const [listName, setListName] = useState('');
  const [listType, setListType] = useState<'static' | 'dynamic'>('static');
  const [contactLists, setContactLists] = useState<ContactList[]>([
    {
      id: '1',
      name: 'Q1 Prospects',
      type: 'static',
      contactCount: 127,
      createdAt: '2024-01-15',
      sharedWith: ['sales-team']
    },
    {
      id: '2',
      name: 'Tech CEOs - Bay Area',
      type: 'dynamic',
      contactCount: 85,
      createdAt: '2024-01-10',
      sharedWith: [],
      filters: { industry: 'Technology', location: 'San Francisco', jobTitles: ['CEO'] }
    }
  ]);

  const handleCreateList = () => {
    if (!listName.trim()) return;

    const newList: ContactList = {
      id: Date.now().toString(),
      name: listName,
      type: listType,
      contactCount: listType === 'static' ? selectedContacts.length || allContacts.length : allContacts.length,
      createdAt: new Date().toISOString().split('T')[0],
      sharedWith: []
    };

    setContactLists([newList, ...contactLists]);
    setListName('');
  };

  const handleDeleteList = (id: string) => {
    setContactLists(contactLists.filter(list => list.id !== id));
  };

  const handleShareList = (id: string) => {
    // In real app, would open sharing modal
    console.log('Sharing list:', id);
  };

  const handleRefreshDynamic = (id: string) => {
    // In real app, would refresh dynamic list based on current filters
    console.log('Refreshing dynamic list:', id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <List className="mr-2 h-5 w-5" />
            Contact Lists
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Create New List */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="listName">Create New List</Label>
                  <Input
                    id="listName"
                    placeholder="Enter list name..."
                    value={listName}
                    onChange={(e) => setListName(e.target.value)}
                    className="mt-2"
                  />
                </div>

                <div>
                  <Label>List Type</Label>
                  <RadioGroup value={listType} onValueChange={(value) => setListType(value as 'static' | 'dynamic')} className="mt-2">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="static" id="static" />
                      <Label htmlFor="static" className="text-sm">
                        Static List - Save current results ({selectedContacts.length || allContacts.length} contacts)
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="dynamic" id="dynamic" />
                      <Label htmlFor="dynamic" className="text-sm">
                        Dynamic List - Auto-update based on current filters
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <Button onClick={handleCreateList} disabled={!listName.trim()} className="w-full">
                  <List className="mr-2 h-4 w-4" />
                  Create List
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Existing Lists */}
          <div className="space-y-3">
            <h3 className="font-semibold">Your Contact Lists</h3>
            {contactLists.map((list) => (
              <Card key={list.id}>
                <CardContent className="pt-4">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <List className="h-4 w-4 text-gray-500" />
                        <span className="font-medium">{list.name}</span>
                        <Badge variant={list.type === 'static' ? 'secondary' : 'outline'}>
                          {list.type === 'static' ? 'Static' : 'Dynamic'}
                        </Badge>
                        {list.sharedWith.length > 0 && (
                          <Badge variant="secondary" className="text-xs">
                            <Users className="mr-1 h-3 w-3" />
                            Shared
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm text-gray-600 mt-1">
                        {list.contactCount.toLocaleString()} contacts
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        Created: {list.createdAt}
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      {list.type === 'dynamic' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRefreshDynamic(list.id)}
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShareList(list.id)}
                      >
                        <Share className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteList(list.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="flex justify-end">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ContactLists;
