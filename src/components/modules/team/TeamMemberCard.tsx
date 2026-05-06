import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Edit, Mail, Phone, MapPin, Clock, DollarSign, Shield, UserCheck, UserX } from "lucide-react";
import type { TeamMemberRow } from "@/hooks/use-team-data";

interface TeamMemberCardProps {
  member: TeamMemberRow;
  onEdit: (member: TeamMemberRow) => void;
  onToggleStatus: (memberId: string) => void;
}

export const TeamMemberCard = ({ member, onEdit, onToggleStatus }: TeamMemberCardProps) => {
  const permissions = (member.permissions || {}) as Record<string, boolean>;
  const permCount = Object.values(permissions).filter(Boolean).length;

  return (
    <Card className="h-fit">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base sm:text-lg truncate">{member.name}</CardTitle>
            <CardDescription className="flex items-center mt-1 text-xs sm:text-sm">
              <Mail className="w-3 h-3 mr-1 flex-shrink-0" />
              <span className="truncate">{member.email}</span>
            </CardDescription>
          </div>
          <div className="flex space-x-1 flex-shrink-0">
            <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-8 sm:w-8" onClick={() => onEdit(member)}>
              <Edit className="w-5 h-5 sm:w-4 sm:h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 sm:h-8 sm:w-8" onClick={() => onToggleStatus(member.id)}>
              {member.status === "active" ? (
                <UserX className="w-5 h-5 sm:w-4 sm:h-4 text-destructive" />
              ) : (
                <UserCheck className="w-5 h-5 sm:w-4 sm:h-4 text-green-600" />
              )}
            </Button>
          </div>
        </div>
        <div className="flex gap-2 mt-2">
          <Badge variant={member.role === "owner" ? "default" : "secondary"} className="capitalize">{member.role}</Badge>
          <Badge variant={member.status === "active" ? "default" : member.status === "pending" ? "secondary" : "destructive"} className="capitalize">{member.status}</Badge>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {member.phone && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Phone className="w-3 h-3 mr-2" />{member.phone}
            </div>
          )}
          {(member.hourly_rate ?? 0) > 0 && (
            <div className="flex items-center text-sm text-muted-foreground">
              <DollarSign className="w-3 h-3 mr-2" />${member.hourly_rate}/hour
            </div>
          )}
          {member.assigned_locations && member.assigned_locations.length > 0 && (
            <div className="flex items-start text-sm text-muted-foreground">
              <MapPin className="w-3 h-3 mr-2 mt-0.5 flex-shrink-0" />
              <div className="flex flex-wrap gap-1">
                {member.assigned_locations.map((loc, i) => (
                  <span key={i} className="text-xs bg-muted px-2 py-1 rounded">{loc}</span>
                ))}
              </div>
            </div>
          )}
          <div className="flex items-center text-sm text-muted-foreground">
            <Shield className="w-3 h-3 mr-2" />
            {permCount} permissions
          </div>
          {member.last_login && (
            <div className="flex items-center text-sm text-muted-foreground">
              <Clock className="w-3 h-3 mr-2" />
              Last login: {new Date(member.last_login).toLocaleDateString()}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
