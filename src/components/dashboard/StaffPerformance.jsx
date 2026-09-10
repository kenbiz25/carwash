import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Users, Award } from "lucide-react";

export default function StaffPerformance({ staff = [], washes = [] }) {
  const today = new Date().toDateString();
  
  // Calculate today's performance for each staff
  const staffPerformance = staff
    .filter(s => s.is_active !== false)
    .map(s => {
      const todayWashes = washes.filter(w => 
        w.assigned_staff_id === s.id && 
        new Date(w.created_date).toDateString() === today
      );
      const completedWashes = todayWashes.filter(w => ['done', 'paid'].includes(w.status));
      const earnings = completedWashes.reduce((sum, w) => {
        const commission = (w.amount_due || 0) * ((s.commission_rate || 10) / 100);
        return sum + commission;
      }, 0);
      
      return {
        ...s,
        todayWashes: completedWashes.length,
        todayEarnings: Math.round(earnings)
      };
    })
    .sort((a, b) => b.todayWashes - a.todayWashes)
    .slice(0, 5);

  return (
    <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Users className="h-5 w-5 text-blue-500" />
          Top Performers Today
        </CardTitle>
      </CardHeader>
      <CardContent>
        {staffPerformance.length === 0 ? (
          <div className="text-center py-6 text-slate-400">
            <Users className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p>No staff activity yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {staffPerformance.map((member, index) => (
              <div 
                key={member.id}
                className="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
              >
                <div className="relative">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={member.photo_url} />
                    <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-cyan-500 text-white">
                      {member.name?.charAt(0) || "S"}
                    </AvatarFallback>
                  </Avatar>
                  {index === 0 && member.todayWashes > 0 && (
                    <Award className="absolute -top-1 -right-1 h-4 w-4 text-amber-500" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 dark:text-white truncate">
                    {member.name}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                    {member.role}
                  </p>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
                    {member.todayWashes} washes
                  </Badge>
                  <p className="text-xs text-slate-500 mt-1">
                    KES {member.todayEarnings.toLocaleString()} earned
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}