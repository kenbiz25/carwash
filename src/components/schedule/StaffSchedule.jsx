import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Plus, ChevronLeft, ChevronRight, Users, Check, X } from "lucide-react";
import { api } from "@/api/firebaseClient";
import { toast } from "sonner";
import moment from "moment";

const timeSlots = [];
for (let h = 6; h <= 22; h++) {
  timeSlots.push(`${h.toString().padStart(2, '0')}:00`);
  if (h < 22) timeSlots.push(`${h.toString().padStart(2, '0')}:30`);
}

const statusColors = {
  scheduled: "bg-blue-100 text-blue-700 border-blue-200",
  confirmed: "bg-green-100 text-green-700 border-green-200",
  clocked_in: "bg-emerald-100 text-emerald-700 border-emerald-200",
  clocked_out: "bg-slate-100 text-slate-700 border-slate-200",
  absent: "bg-red-100 text-red-700 border-red-200",
  leave: "bg-purple-100 text-purple-700 border-purple-200"
};

export default function StaffSchedule({ businessId, staff = [], schedules = [], onRefresh }) {
  const [currentWeek, setCurrentWeek] = useState(moment().startOf('week'));
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [newSchedule, setNewSchedule] = useState({
    staff_id: "",
    shift_start: "08:00",
    shift_end: "17:00",
    bay_assignment: "",
    notes: ""
  });

  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    weekDays.push(moment(currentWeek).add(i, 'days'));
  }

  const getScheduleForCell = (staffId, date) => {
    return schedules.find(s => 
      s.staff_id === staffId && 
      moment(s.date).format('YYYY-MM-DD') === date.format('YYYY-MM-DD')
    );
  };

  const handleAddSchedule = async () => {
    if (!newSchedule.staff_id || !selectedDate) {
      toast.error("Please select staff and date");
      return;
    }

    const staffMember = staff.find(s => s.id === newSchedule.staff_id);

    await api.entities.Schedule.create({
      business_id: businessId,
      staff_id: newSchedule.staff_id,
      staff_name: staffMember?.name,
      date: selectedDate.format('YYYY-MM-DD'),
      shift_start: newSchedule.shift_start,
      shift_end: newSchedule.shift_end,
      bay_assignment: newSchedule.bay_assignment ? parseInt(newSchedule.bay_assignment) : null,
      notes: newSchedule.notes,
      status: "scheduled"
    });

    toast.success("Schedule added");
    setDialogOpen(false);
    setNewSchedule({ staff_id: "", shift_start: "08:00", shift_end: "17:00", bay_assignment: "", notes: "" });
    onRefresh?.();
  };

  const handleCellClick = (staffMember, date) => {
    const existing = getScheduleForCell(staffMember.id, date);
    if (!existing) {
      setSelectedStaff(staffMember);
      setSelectedDate(date);
      setNewSchedule(prev => ({ ...prev, staff_id: staffMember.id }));
      setDialogOpen(true);
    }
  };

  const handleUpdateStatus = async (schedule, newStatus) => {
    await api.entities.Schedule.update(schedule.id, { status: newStatus });
    toast.success("Status updated");
    onRefresh?.();
  };

  const handleDeleteSchedule = async (scheduleId) => {
    await api.entities.Schedule.delete(scheduleId);
    toast.success("Schedule removed");
    onRefresh?.();
  };

  return (
    <div className="space-y-4">
      {/* Week Navigation */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => setCurrentWeek(moment(currentWeek).subtract(1, 'week'))}>
          <ChevronLeft className="h-4 w-4 mr-1" />
          Previous
        </Button>
        <h3 className="font-semibold">
          {currentWeek.format('MMM D')} - {moment(currentWeek).add(6, 'days').format('MMM D, YYYY')}
        </h3>
        <Button variant="outline" size="sm" onClick={() => setCurrentWeek(moment(currentWeek).add(1, 'week'))}>
          Next
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>

      {/* Schedule Grid */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse min-w-[800px]">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-800">
                <th className="p-3 text-left font-medium text-slate-600 dark:text-slate-400 w-40 border-b">
                  Staff
                </th>
                {weekDays.map(day => (
                  <th 
                    key={day.format('YYYY-MM-DD')} 
                    className={`p-3 text-center font-medium border-b ${
                      day.isSame(moment(), 'day') 
                        ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400' 
                        : 'text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    <div className="text-xs">{day.format('ddd')}</div>
                    <div className="text-lg">{day.format('D')}</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.filter(s => s.is_active !== false).map(staffMember => (
                <tr key={staffMember.id} className="border-b hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={staffMember.photo_url} />
                        <AvatarFallback className="bg-gradient-to-br from-emerald-500 to-cyan-500 text-white text-xs">
                          {staffMember.name?.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium text-sm">{staffMember.name}</p>
                        <p className="text-xs text-slate-500 capitalize">{staffMember.role}</p>
                      </div>
                    </div>
                  </td>
                  {weekDays.map(day => {
                    const schedule = getScheduleForCell(staffMember.id, day);
                    return (
                      <td 
                        key={day.format('YYYY-MM-DD')} 
                        className={`p-2 border-l ${day.isSame(moment(), 'day') ? 'bg-emerald-50/50 dark:bg-emerald-900/10' : ''}`}
                        onClick={() => !schedule && handleCellClick(staffMember, day)}
                      >
                        {schedule ? (
                          <div className={`p-2 rounded-lg border text-xs ${statusColors[schedule.status]}`}>
                            <div className="font-medium flex items-center justify-between">
                              <span>{schedule.shift_start} - {schedule.shift_end}</span>
                              <button 
                                onClick={(e) => { e.stopPropagation(); handleDeleteSchedule(schedule.id); }}
                                className="opacity-0 hover:opacity-100 text-red-500"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                            {schedule.bay_assignment && (
                              <div className="mt-1">Bay {schedule.bay_assignment}</div>
                            )}
                            <div className="mt-1 flex gap-1">
                              {schedule.status === 'scheduled' && (
                                <button 
                                  onClick={(e) => { e.stopPropagation(); handleUpdateStatus(schedule, 'confirmed'); }}
                                  className="p-1 bg-white rounded hover:bg-green-100"
                                >
                                  <Check className="h-3 w-3 text-green-600" />
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="h-12 rounded-lg border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-emerald-400 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/20 cursor-pointer flex items-center justify-center transition-colors">
                            <Plus className="h-4 w-4 text-slate-400" />
                          </div>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Add Schedule Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Add Schedule
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <p className="text-sm text-slate-500">Staff: <span className="font-medium text-slate-900 dark:text-white">{selectedStaff?.name}</span></p>
              <p className="text-sm text-slate-500">Date: <span className="font-medium text-slate-900 dark:text-white">{selectedDate?.format('dddd, MMMM D, YYYY')}</span></p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Shift Start</Label>
                <Select value={newSchedule.shift_start} onValueChange={(v) => setNewSchedule(prev => ({ ...prev, shift_start: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {timeSlots.map(time => <SelectItem key={time} value={time}>{time}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Shift End</Label>
                <Select value={newSchedule.shift_end} onValueChange={(v) => setNewSchedule(prev => ({ ...prev, shift_end: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {timeSlots.map(time => <SelectItem key={time} value={time}>{time}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Bay Assignment (Optional)</Label>
              <Input
                type="number"
                placeholder="1"
                value={newSchedule.bay_assignment}
                onChange={(e) => setNewSchedule(prev => ({ ...prev, bay_assignment: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                placeholder="Any notes for this shift..."
                value={newSchedule.notes}
                onChange={(e) => setNewSchedule(prev => ({ ...prev, notes: e.target.value }))}
              />
            </div>

            <Button onClick={handleAddSchedule} className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500">
              <Plus className="h-4 w-4 mr-2" />
              Add Schedule
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}