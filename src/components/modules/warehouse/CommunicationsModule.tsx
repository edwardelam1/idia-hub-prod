import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  MessageSquare, Send, Phone, Mail, Truck, Package, 
  Clock, CheckCircle, AlertTriangle, User, Building, 
  Radio, Bell, FileText, MapPin
} from "lucide-react";
import { toast } from "sonner";

interface Message {
  id: string;
  type: 'inbound' | 'outbound';
  contactType: 'shipper' | 'receiver' | 'carrier';
  contactName: string;
  subject: string;
  message: string;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read' | 'pending';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  relatedPO?: string;
  relatedShipment?: string;
}

interface Contact {
  id: string;
  name: string;
  company: string;
  type: 'shipper' | 'receiver' | 'carrier';
  email: string;
  phone: string;
  lastContact: string;
  status: 'active' | 'pending' | 'inactive';
}

const mockMessages: Message[] = [
  {
    id: 'msg-001',
    type: 'inbound',
    contactType: 'carrier',
    contactName: 'FedEx Freight - Driver Mike',
    subject: 'Arrival ETA Update',
    message: 'Truck #T-789 arriving at Dock 3 in approximately 45 minutes. 234 units on board.',
    timestamp: new Date(Date.now() - 1800000).toISOString(),
    status: 'read',
    priority: 'high',
    relatedPO: 'PO-2026-0142'
  },
  {
    id: 'msg-002',
    type: 'outbound',
    contactType: 'shipper',
    contactName: 'Sysco Food Services',
    subject: 'Order Confirmation',
    message: 'Confirming receipt of PO-2026-0145. Please confirm ship date.',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    status: 'delivered',
    priority: 'normal',
    relatedPO: 'PO-2026-0145'
  },
  {
    id: 'msg-003',
    type: 'inbound',
    contactType: 'receiver',
    contactName: 'Downtown Bistro - Chef Rodriguez',
    subject: 'Delivery Window Request',
    message: 'Requesting delivery between 6-8 AM tomorrow. Kitchen prep starts at 9 AM.',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    status: 'read',
    priority: 'normal',
    relatedShipment: 'SHIP-2026-0456'
  },
  {
    id: 'msg-004',
    type: 'inbound',
    contactType: 'carrier',
    contactName: 'UPS Ground - Dispatch',
    subject: 'Weather Delay Notice',
    message: 'Due to weather conditions, shipment SHIP-2026-0457 delayed by 2 hours.',
    timestamp: new Date(Date.now() - 900000).toISOString(),
    status: 'pending',
    priority: 'urgent'
  }
];

const mockContacts: Contact[] = [
  {
    id: 'con-001',
    name: 'Mike Thompson',
    company: 'FedEx Freight',
    type: 'carrier',
    email: 'mike.t@fedex.com',
    phone: '+1 (555) 123-4567',
    lastContact: new Date(Date.now() - 1800000).toISOString(),
    status: 'active'
  },
  {
    id: 'con-002',
    name: 'Sarah Chen',
    company: 'Sysco Food Services',
    type: 'shipper',
    email: 'schen@sysco.com',
    phone: '+1 (555) 234-5678',
    lastContact: new Date(Date.now() - 86400000).toISOString(),
    status: 'active'
  },
  {
    id: 'con-003',
    name: 'Chef Rodriguez',
    company: 'Downtown Bistro',
    type: 'receiver',
    email: 'chef@downtownbistro.com',
    phone: '+1 (555) 345-6789',
    lastContact: new Date(Date.now() - 7200000).toISOString(),
    status: 'active'
  },
  {
    id: 'con-004',
    name: 'Dispatch Center',
    company: 'UPS Ground',
    type: 'carrier',
    email: 'dispatch@ups.com',
    phone: '+1 (555) 456-7890',
    lastContact: new Date(Date.now() - 900000).toISOString(),
    status: 'active'
  }
];

export const CommunicationsModule = () => {
  const [messages, setMessages] = useState<Message[]>(mockMessages);
  const [contacts, setContacts] = useState<Contact[]>(mockContacts);
  const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [activeTab, setActiveTab] = useState('inbox');
  const [composeOpen, setComposeOpen] = useState(false);
  const [composeData, setComposeData] = useState({
    recipient: '',
    subject: '',
    message: '',
    priority: 'normal'
  });

  const sendMessage = () => {
    if (!composeData.recipient || !composeData.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    const contact = contacts.find(c => c.id === composeData.recipient);
    const newMsg: Message = {
      id: `msg-${Date.now()}`,
      type: 'outbound',
      contactType: contact?.type || 'carrier',
      contactName: contact ? `${contact.name} - ${contact.company}` : 'Unknown',
      subject: composeData.subject || 'No Subject',
      message: composeData.message,
      timestamp: new Date().toISOString(),
      status: 'sent',
      priority: composeData.priority as Message['priority']
    };

    setMessages(prev => [newMsg, ...prev]);
    setComposeOpen(false);
    setComposeData({ recipient: '', subject: '', message: '', priority: 'normal' });
    toast.success('Message sent successfully');
  };

  const getContactIcon = (type: string) => {
    switch (type) {
      case 'carrier': return <Truck className="h-3 w-3" />;
      case 'shipper': return <Building className="h-3 w-3" />;
      case 'receiver': return <User className="h-3 w-3" />;
      default: return <MessageSquare className="h-3 w-3" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'default';
      case 'normal': return 'secondary';
      default: return 'outline';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
    return date.toLocaleDateString();
  };

  const unreadCount = messages.filter(m => m.type === 'inbound' && m.status === 'pending').length;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-bold tracking-tight">Communications</h2>
          <p className="text-[10px] text-muted-foreground">Coordinate with receivers, shippers & carriers</p>
        </div>
        <div className="flex items-center gap-1">
          {unreadCount > 0 && (
            <Badge variant="destructive" className="text-[9px] h-4">
              {unreadCount} New
            </Badge>
          )}
          <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="h-7 text-xs">
                <Send className="h-3 w-3 mr-1" />Compose
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="text-sm">New Message</DialogTitle>
                <DialogDescription className="text-xs">Send message to shipper, receiver, or carrier</DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium">Recipient</label>
                  <Select 
                    value={composeData.recipient} 
                    onValueChange={(v) => setComposeData(prev => ({ ...prev, recipient: v }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Select contact" />
                    </SelectTrigger>
                    <SelectContent>
                      {contacts.map(contact => (
                        <SelectItem key={contact.id} value={contact.id} className="text-xs">
                          <div className="flex items-center gap-1">
                            {getContactIcon(contact.type)}
                            <span>{contact.name} - {contact.company}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium">Subject</label>
                  <Input 
                    placeholder="Message subject..."
                    value={composeData.subject}
                    onChange={(e) => setComposeData(prev => ({ ...prev, subject: e.target.value }))}
                    className="h-8 text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium">Priority</label>
                  <Select 
                    value={composeData.priority} 
                    onValueChange={(v) => setComposeData(prev => ({ ...prev, priority: v }))}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low" className="text-xs">Low</SelectItem>
                      <SelectItem value="normal" className="text-xs">Normal</SelectItem>
                      <SelectItem value="high" className="text-xs">High</SelectItem>
                      <SelectItem value="urgent" className="text-xs">Urgent</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-xs font-medium">Message</label>
                  <Textarea 
                    placeholder="Type your message..."
                    value={composeData.message}
                    onChange={(e) => setComposeData(prev => ({ ...prev, message: e.target.value }))}
                    className="text-xs min-h-[100px]"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setComposeOpen(false)} className="h-7 text-xs">
                    Cancel
                  </Button>
                  <Button size="sm" onClick={sendMessage} className="h-7 text-xs">
                    <Send className="h-3 w-3 mr-1" />Send
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-7 text-[10px]">
          <TabsTrigger value="inbox" className="text-[10px] h-6 px-2">
            <MessageSquare className="h-3 w-3 mr-1" />Inbox
          </TabsTrigger>
          <TabsTrigger value="sent" className="text-[10px] h-6 px-2">
            <Send className="h-3 w-3 mr-1" />Sent
          </TabsTrigger>
          <TabsTrigger value="contacts" className="text-[10px] h-6 px-2">
            <User className="h-3 w-3 mr-1" />Contacts
          </TabsTrigger>
          <TabsTrigger value="alerts" className="text-[10px] h-6 px-2">
            <Bell className="h-3 w-3 mr-1" />Alerts
          </TabsTrigger>
        </TabsList>

        <TabsContent value="inbox" className="mt-2 space-y-1.5">
          {messages.filter(m => m.type === 'inbound').map((msg) => (
            <Card key={msg.id} className={msg.status === 'pending' ? 'border-primary bg-primary/5' : ''}>
              <CardContent className="p-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-2">
                    <div className="mt-0.5">
                      {getContactIcon(msg.contactType)}
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <p className="text-[10px] font-medium">{msg.contactName}</p>
                        <Badge variant={getPriorityColor(msg.priority)} className="text-[7px] h-3 px-1">
                          {msg.priority.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-[9px] font-medium text-foreground">{msg.subject}</p>
                      <p className="text-[9px] text-muted-foreground line-clamp-2">{msg.message}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[8px] text-muted-foreground">{formatTime(msg.timestamp)}</span>
                        {msg.relatedPO && (
                          <Badge variant="outline" className="text-[7px] h-3">
                            <FileText className="h-2 w-2 mr-0.5" />{msg.relatedPO}
                          </Badge>
                        )}
                        {msg.relatedShipment && (
                          <Badge variant="outline" className="text-[7px] h-3">
                            <Package className="h-2 w-2 mr-0.5" />{msg.relatedShipment}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Phone className="h-3 w-3" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Mail className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="sent" className="mt-2 space-y-1.5">
          {messages.filter(m => m.type === 'outbound').map((msg) => (
            <Card key={msg.id}>
              <CardContent className="p-2">
                <div className="flex items-start gap-2">
                  <Send className="h-3 w-3 mt-0.5 text-muted-foreground" />
                  <div className="flex-1">
                    <div className="flex items-center gap-1">
                      <p className="text-[10px] font-medium">To: {msg.contactName}</p>
                      <Badge variant="outline" className="text-[7px] h-3">
                        {msg.status === 'delivered' ? <CheckCircle className="h-2 w-2 mr-0.5" /> : <Clock className="h-2 w-2 mr-0.5" />}
                        {msg.status}
                      </Badge>
                    </div>
                    <p className="text-[9px] font-medium">{msg.subject}</p>
                    <p className="text-[9px] text-muted-foreground line-clamp-2">{msg.message}</p>
                    <span className="text-[8px] text-muted-foreground">{formatTime(msg.timestamp)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="contacts" className="mt-2">
          <div className="grid gap-1.5">
            {contacts.map((contact) => (
              <Card key={contact.id}>
                <CardContent className="p-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                        {getContactIcon(contact.type)}
                      </div>
                      <div>
                        <p className="text-[10px] font-medium">{contact.name}</p>
                        <p className="text-[9px] text-muted-foreground">{contact.company}</p>
                        <div className="flex items-center gap-2 text-[8px] text-muted-foreground">
                          <span className="flex items-center gap-0.5">
                            <Mail className="h-2 w-2" />{contact.email}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Phone className="h-2 w-2" />{contact.phone}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Badge variant="outline" className="text-[7px] h-3 capitalize">
                        {contact.type}
                      </Badge>
                      <Button variant="outline" size="sm" className="h-6 text-[9px]">
                        <MessageSquare className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="alerts" className="mt-2 space-y-1.5">
          <Card className="border-orange-200 bg-orange-50 dark:bg-orange-950/20">
            <CardContent className="p-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <div>
                  <p className="text-[10px] font-medium">Weather Delay Alert</p>
                  <p className="text-[9px] text-muted-foreground">UPS Ground shipment delayed 2 hours due to conditions</p>
                  <span className="text-[8px] text-muted-foreground">15m ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
            <CardContent className="p-2">
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4 text-blue-500" />
                <div>
                  <p className="text-[10px] font-medium">Truck Arrival Notice</p>
                  <p className="text-[9px] text-muted-foreground">FedEx Truck #T-789 arriving Dock 3 in 45 minutes</p>
                  <span className="text-[8px] text-muted-foreground">30m ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
            <CardContent className="p-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <div>
                  <p className="text-[10px] font-medium">Delivery Confirmed</p>
                  <p className="text-[9px] text-muted-foreground">SHIP-2026-0455 delivered to Seaside Grill</p>
                  <span className="text-[8px] text-muted-foreground">1h ago</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
