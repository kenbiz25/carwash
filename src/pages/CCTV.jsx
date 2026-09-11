import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/api/firebaseClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Video,
  Camera,
  Plus,
  Maximize2,
  Grid3X3,
  WifiOff,
  X,
  Loader2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useBusiness } from "@/lib/BusinessContext";

export default function CCTV() {
  const [layout, setLayout] = useState("grid"); // grid, single
  const [selectedFeed, setSelectedFeed] = useState(null);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newFeed, setNewFeed] = useState({
    name: "",
    stream_url: "",
    stream_type: "http",
    location: "",
    bay_number: ""
  });
  const [saving, setSaving] = useState(false);

  const { currentBusiness: business } = useBusiness();

  const { data: feeds = [], refetch } = useQuery({
    queryKey: ["cctvFeeds", business?.id],
    queryFn: () => api.entities.CCTVFeed.filter({ business_id: business?.id }),
    enabled: !!business?.id,
  });

  const handleAddFeed = async () => {
    if (!newFeed.name || !newFeed.stream_url) {
      toast.error("Please fill in camera name and stream URL");
      return;
    }

    setSaving(true);
    await api.entities.CCTVFeed.create({
      ...newFeed,
      business_id: business.id,
      bay_number: newFeed.bay_number ? parseInt(newFeed.bay_number) : null,
      is_active: true
    });
    
    toast.success("Camera added successfully!");
    setNewFeed({ name: "", stream_url: "", stream_type: "http", location: "", bay_number: "" });
    setAddDialogOpen(false);
    setSaving(false);
    refetch();
  };

  const handleDeleteFeed = async (feedId) => {
    await api.entities.CCTVFeed.delete(feedId);
    toast.success("Camera removed");
    refetch();
  };

  const renderFeed = (feed, isFullscreen = false) => {
    if (!feed.stream_url) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-800">
          <WifiOff className="h-12 w-12 text-slate-500 mb-3" />
          <span className="text-slate-400">No stream configured</span>
        </div>
      );
    }

    if (feed.stream_type === 'youtube' || feed.stream_url.includes('youtube')) {
      const videoId = feed.stream_url.match(/(?:embed\/|v=|youtu\.be\/)([^&?]+)/)?.[1];
      return (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=${isFullscreen ? 1 : 0}`}
          className="absolute inset-0 w-full h-full"
          allow="autoplay; fullscreen"
          frameBorder="0"
        />
      );
    }

    if (feed.stream_type === 'iframe') {
      return (
        <iframe
          src={feed.stream_url}
          className="absolute inset-0 w-full h-full"
          frameBorder="0"
          allow="fullscreen"
        />
      );
    }

    if (feed.stream_type === 'mjpeg' || feed.stream_type === 'http') {
      return (
        <img
          src={feed.stream_url}
          alt={feed.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
      );
    }

    // Placeholder for RTSP/HLS
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
        <Camera className="h-16 w-16 text-emerald-500 mb-4 animate-pulse" />
        <span className="text-white font-medium text-lg">{feed.name}</span>
        <span className="text-slate-400 text-sm mt-1">{feed.location || "Live Feed"}</span>
        <span className="text-emerald-400 text-xs mt-2 flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          Connected
        </span>
      </div>
    );
  };

  const activeFeeds = feeds.filter(f => f.is_active !== false);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Video className="h-6 w-6 text-red-500" />
            Live CCTV
            <span className="flex h-2 w-2 ml-1">
              <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Monitor your car wash in real-time
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 rounded-lg p-1">
            <Button
              variant={layout === "grid" ? "default" : "ghost"}
              size="sm"
              onClick={() => setLayout("grid")}
              className={layout === "grid" ? "bg-white dark:bg-slate-700 shadow-sm" : ""}
            >
              <Grid3X3 className="h-4 w-4" />
            </Button>
            <Button
              variant={layout === "single" ? "default" : "ghost"}
              size="sm"
              onClick={() => setLayout("single")}
              className={layout === "single" ? "bg-white dark:bg-slate-700 shadow-sm" : ""}
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          </div>
          
          <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="gradient">
                <Plus className="h-4 w-4 mr-2" />
                Add Camera
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add CCTV Camera</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Camera Name *</Label>
                  <Input
                    placeholder="e.g., Bay 1, Entrance"
                    value={newFeed.name}
                    onChange={(e) => setNewFeed({ ...newFeed, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stream URL *</Label>
                  <Input
                    placeholder="http://... or rtsp://..."
                    value={newFeed.stream_url}
                    onChange={(e) => setNewFeed({ ...newFeed, stream_url: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stream Type</Label>
                  <Select
                    value={newFeed.stream_type}
                    onValueChange={(value) => setNewFeed({ ...newFeed, stream_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="http">HTTP/JPEG</SelectItem>
                      <SelectItem value="mjpeg">MJPEG Stream</SelectItem>
                      <SelectItem value="youtube">YouTube Live</SelectItem>
                      <SelectItem value="iframe">Iframe Embed</SelectItem>
                      <SelectItem value="rtsp">RTSP</SelectItem>
                      <SelectItem value="hls">HLS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Location</Label>
                    <Input
                      placeholder="e.g., Front Gate"
                      value={newFeed.location}
                      onChange={(e) => setNewFeed({ ...newFeed, location: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bay Number</Label>
                    <Input
                      type="number"
                      placeholder="1"
                      value={newFeed.bay_number}
                      onChange={(e) => setNewFeed({ ...newFeed, bay_number: e.target.value })}
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleAddFeed} 
                  variant="gradient" className="w-full"
                  disabled={saving}
                >
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
                  Add Camera
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Camera Grid */}
      {activeFeeds.length === 0 ? (
        <Card className="p-12 text-center bg-white dark:bg-slate-800 border-0 shadow-sm">
          <Camera className="h-16 w-16 mx-auto mb-4 text-slate-300" />
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
            No cameras configured
          </h3>
          <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
            Connect your IP cameras, webcams, or streaming URLs to monitor your car wash operations live.
          </p>
          <Button 
            onClick={() => setAddDialogOpen(true)}
            variant="gradient"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Your First Camera
          </Button>
        </Card>
      ) : layout === "single" && selectedFeed ? (
        /* Single/Fullscreen View */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-slate-900 dark:text-white">{selectedFeed.name}</h3>
            <Button variant="outline" size="sm" onClick={() => { setSelectedFeed(null); setLayout("grid"); }}>
              <Grid3X3 className="h-4 w-4 mr-2" />
              Back to Grid
            </Button>
          </div>
          <div className="relative aspect-video bg-slate-900 rounded-xl overflow-hidden shadow-lg">
            {renderFeed(selectedFeed, true)}
          </div>
        </div>
      ) : (
        /* Grid View */
        <div className={cn(
          "grid gap-4",
          activeFeeds.length === 1 ? "grid-cols-1" :
          activeFeeds.length === 2 ? "grid-cols-1 md:grid-cols-2" :
          activeFeeds.length <= 4 ? "grid-cols-2" :
          "grid-cols-2 lg:grid-cols-3"
        )}>
          {activeFeeds.map((feed) => (
            <Card 
              key={feed.id} 
              className="overflow-hidden bg-white dark:bg-slate-800 border-0 shadow-sm group"
            >
              <div 
                className="relative aspect-video bg-slate-900 cursor-pointer"
                onClick={() => { setSelectedFeed(feed); setLayout("single"); }}
              >
                {renderFeed(feed)}
                
                {/* Overlay on Hover */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                  <Button size="sm" variant="secondary" className="bg-white/20 backdrop-blur">
                    <Maximize2 className="h-4 w-4 mr-1" />
                    Fullscreen
                  </Button>
                </div>

                {/* Camera Name Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-white font-medium">{feed.name}</span>
                      {feed.location && (
                        <span className="text-slate-300 text-xs block">{feed.location}</span>
                      )}
                    </div>
                    <span className="flex items-center gap-1 text-emerald-400 text-xs">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="p-3 flex items-center justify-between">
                {feed.bay_number && (
                  <span className="text-xs bg-slate-100 dark:bg-slate-700 px-2 py-1 rounded">
                    Bay {feed.bay_number}
                  </span>
                )}
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="text-red-500 hover:text-red-600 hover:bg-red-50 ml-auto"
                  onClick={() => handleDeleteFeed(feed.id)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Setup Guide */}
      {activeFeeds.length > 0 && activeFeeds.length < 4 && (
        <Card className="p-6 bg-gradient-to-r from-slate-50 to-emerald-50 dark:from-slate-800 dark:to-emerald-900/20 border-0">
          <h3 className="font-semibold text-slate-900 dark:text-white mb-2">📹 Camera Setup Tips</h3>
          <ul className="text-sm text-slate-600 dark:text-slate-400 space-y-1">
            <li>• For Hikvision/Dahua cameras, use the RTSP URL from your camera's settings</li>
            <li>• YouTube Live: Use the embed URL (youtube.com/embed/VIDEO_ID)</li>
            <li>• For simple IP cameras, use the snapshot/MJPEG URL</li>
            <li>• Position cameras at wash bays, entrance, and payment areas</li>
          </ul>
        </Card>
      )}
    </div>
  );
}