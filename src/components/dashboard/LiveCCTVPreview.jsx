import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Video, Maximize2, ChevronRight, Camera, WifiOff } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function LiveCCTVPreview({ feeds = [] }) {
  const activeFeeds = feeds.filter(f => f.is_active !== false).slice(0, 4);

  const renderFeedPreview = (feed) => {
    if (!feed.stream_url) {
      return (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-100 dark:bg-slate-700">
          <WifiOff className="h-8 w-8 text-slate-400 mb-2" />
          <span className="text-xs text-slate-400">No stream</span>
        </div>
      );
    }

    // Handle different stream types
    if (feed.stream_type === 'youtube' || feed.stream_url.includes('youtube')) {
      const videoId = feed.stream_url.match(/(?:embed\/|v=)([^&?]+)/)?.[1];
      return (
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&controls=0`}
          className="absolute inset-0 w-full h-full"
          allow="autoplay"
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
        />
      );
    }

    // For MJPEG/HTTP streams
    if (feed.stream_type === 'mjpeg' || feed.stream_type === 'http') {
      return (
        <img
          src={feed.stream_url}
          alt={feed.name}
          className="absolute inset-0 w-full h-full object-cover"
        />
      );
    }

    // Placeholder for RTSP (would need server-side transcoding)
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
        <Camera className="h-8 w-8 text-emerald-500 mb-2 animate-pulse" />
        <span className="text-xs text-slate-300">{feed.name}</span>
        <span className="text-xs text-slate-500">Live Feed</span>
      </div>
    );
  };

  return (
    <Card className="bg-white dark:bg-slate-800 border-0 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
          <Video className="h-5 w-5 text-red-500" />
          Live CCTV
          <span className="flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-red-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
          </span>
        </CardTitle>
        <Link to={createPageUrl("CCTV")}>
          <Button variant="ghost" size="sm" className="text-emerald-600 hover:text-emerald-700">
            Full View <Maximize2 className="h-4 w-4 ml-1" />
          </Button>
        </Link>
      </CardHeader>
      <CardContent>
        {activeFeeds.length === 0 ? (
          <div className="text-center py-8 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
            <Camera className="h-12 w-12 mx-auto mb-3 text-slate-300" />
            <p className="text-slate-500 dark:text-slate-400 mb-3">No cameras configured</p>
            <Link to={createPageUrl("Settings")}>
              <Button variant="outline" size="sm">
                Add Camera
              </Button>
            </Link>
          </div>
        ) : (
          <div className={`grid gap-2 ${activeFeeds.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {activeFeeds.map((feed) => (
              <div 
                key={feed.id} 
                className="relative aspect-video bg-slate-900 rounded-lg overflow-hidden group"
              >
                {renderFeedPreview(feed)}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2">
                  <span className="text-xs text-white font-medium">{feed.name}</span>
                </div>
                <Link 
                  to={createPageUrl("CCTV")}
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 transition-opacity"
                >
                  <Maximize2 className="h-6 w-6 text-white" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}