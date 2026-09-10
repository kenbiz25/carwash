import React from "react";
import EnhancedCheckIn from "./EnhancedCheckIn";

// Re-export EnhancedCheckIn as QuickCheckIn for backward compatibility
export default function QuickCheckIn(props) {
  return <EnhancedCheckIn {...props} />;
}