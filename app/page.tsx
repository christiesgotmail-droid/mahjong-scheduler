
"use client";
console.log("PAGE TSX LOADED");

import { useState } from "react";
import { useEffect } from "react";
import Image from "next/image";
import { supabase } from "./supabase";

const startingFriends = [];


const times = [
  "9:00 AM",
  "9:30 AM",
  "10:00 AM",
  "10:30 AM",
  "11:00 AM",
  "11:30 AM",
  "12:00 PM",
  "12:30 PM",
  "1:00 PM",
  "1:30 PM",
  "2:00 PM",
  "2:30 PM",
  "3:00 PM",
  "3:30 PM",
  "4:00 PM",
  "4:30 PM",
  "5:00 PM",
  "5:30 PM",
  "6:00 PM",
  "6:30 PM",
  "7:00 PM",
  "7:30 PM",
  "8:00 PM",
  "8:30 PM",
  "9:00 PM",
];

const resetAllData = () => {
  localStorage.clear();
  window.location.reload();
};

function getConnectedSlots(slot: string, slotsToCheck: string[]) {
  const selectedIndex = times.findIndex((time) => slot.endsWith(time));

  if (selectedIndex === -1) {
    return [slot];
  }

  const selectedDay = slot.replace(` ${times[selectedIndex]}`, "");
  const connectedSlots = [slot];

  for (let i = selectedIndex - 1; i >= 0; i--) {
    const connectedSlot = `${selectedDay} ${times[i]}`;

    if (slotsToCheck.includes(connectedSlot)) {
      connectedSlots.push(connectedSlot);
    } else {
      break;
    }
  }

  for (let i = selectedIndex + 1; i < times.length; i++) {
    const connectedSlot = `${selectedDay} ${times[i]}`;

    if (slotsToCheck.includes(connectedSlot)) {
      connectedSlots.push(connectedSlot);
    } else {
      break;
    }
  }

  return connectedSlots;
}

function isSameHost(playerName: string, hostName?: string) {
  if (!hostName) {
    return false;
  }

  if (hostName === playerName) {
    return true;
  }

  return (
    hostName.split(" ")[0].toLowerCase() ===
    playerName.split(" ")[0].toLowerCase()
  );
}

export default function Home() {
  
  const [weekOffset, setWeekOffset] = useState(0);

function getWeekDays() {
  const today = new Date();
  const day = today.getDay();
  const mondayOffset = day === 0 ? -6 : 1 - day;

  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset + weekOffset * 7);

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(monday);
    date.setDate(monday.getDate() + index);

   const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
   const weekdayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
return `${weekdayNames[date.getDay()]} ${monthNames[date.getMonth()]} ${date.getDate()}`;
  });
}

const [friends, setFriends] = useState<{ id: string; name: string; phone: string }[]>([]);
  
const days = getWeekDays();

useEffect(() => {
  async function loadPlayers() {
    const { data, error } = await supabase
      .from("players")
      .select("*")
      .order("name");

    if (error) {
  alert("Players did not load: " + error.message);
  console.error(error);
  return;
}

    const formattedPlayers =
      data?.map((player) => ({
        id: player.id,
        name: player.name,
        phone: player.Name || "",
      })) || [];

    setFriends(formattedPlayers);
  }

  loadPlayers();
}, []);



  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [selectedFriendId, setSelectedFriendId] = useState("1");
  const [availability, setAvailability] = useState<Record<string, string[]>>({});
  const [hosts, setHosts] = useState<Record<string, string>>({});
  const [hostAddresses, setHostAddresses] = useState<Record<string, string>>({});
useEffect(() => {
  async function loadHosts() {
    const { data, error } = await supabase
      .from("hosts")
      .select("*");

    if (error) {
      alert(error.message);
      return;
    }

    const loadedHosts: Record<string, string> = {};
    const loadedHostAddresses: Record<string, string> = {};

    data?.forEach((row) => {
      loadedHosts[row.slot] = row.host_name;
      loadedHostAddresses[row.slot] = row.host_address || "";
    });

    setHosts(loadedHosts);
    setHostAddresses(loadedHostAddresses);
  }

  loadHosts();
}, []);
  const [selectedSlot, setSelectedSlot] = useState("");
  const [hostName, setHostName] = useState("");
const [hostAddress, setHostAddress] = useState("");
const [showPopup, setShowPopup] = useState(false);

useEffect(() => {
  async function loadAvailability() {
    const { data, error } = await supabase
      .from("availability")
      .select("*");

    if (error) {
      alert(error.message);
      return;
    }

    const grouped: Record<string, string[]> = {};

    data?.forEach((row) => {
      if (!grouped[row.player_id]) {
        grouped[row.player_id] = [];
      }

      grouped[row.player_id].push(row.slot);
    });

    setAvailability(grouped);
  }

  loadAvailability();
}, []);


useEffect(() => {
  localStorage.setItem("mahjongAvailability", JSON.stringify(availability));
}, [availability]);
 async function toggleSlot(slot: string) {
  const current = availability[selectedFriendId] || [];
  const isSelected = current.includes(slot);
  const selectedFriend = friends.find((f) => f.id === selectedFriendId);

  if (!selectedFriend) {
    alert("Please select your name first.");
    return;
  }

  if (!isSelected && countAvailable(slot) >= 8) {
    setSelectedSlot(slot);
    return;
  }

  const hostedSlots = Object.keys(hosts).filter((hostSlot) =>
    isSameHost(selectedFriend.name, hosts[hostSlot])
  );
  const hostSlotsToRemove =
    isSelected && isSameHost(selectedFriend.name, hosts[slot])
      ? getConnectedSlots(slot, hostedSlots)
      : [];

  if (isSelected) {
    const { error } = await supabase
      .from("availability")
      .delete()
      .eq("player_id", selectedFriendId)
      .eq("slot", slot);

    if (error) {
      alert("Delete failed: " + error.message);
      return;
    }

    if (hostSlotsToRemove.length > 0) {
      const { error: hostDeleteError } = await supabase
        .from("hosts")
        .delete()
        .in("slot", hostSlotsToRemove);

      if (hostDeleteError) {
        alert("Host delete failed: " + hostDeleteError.message);
        return;
      }
    }
  } else {
    await supabase.from("availability").insert([
      {
        player_id: selectedFriendId,
        player_name: selectedFriend.name,
        slot: slot,
      },
    ]);
  }

  setAvailability({
    ...availability,
    [selectedFriendId]: isSelected
      ? current.filter((item) => item !== slot)
      : [...current, slot],
  });

  if (hostSlotsToRemove.length > 0) {
    const updatedHosts = { ...hosts };
    const updatedHostAddresses = { ...hostAddresses };

    hostSlotsToRemove.forEach((hostSlot) => {
      delete updatedHosts[hostSlot];
      delete updatedHostAddresses[hostSlot];
    });

    setHosts(updatedHosts);
    setHostAddresses(updatedHostAddresses);
  }
}
  function countAvailable(slot: string) {
    return friends.filter((friend) => availability[friend.id]?.includes(slot)).length;
  }

  function availableFriends(slot: string) {
    return friends.filter((friend) => availability[friend.id]?.includes(slot));
  }

 async function volunteerHost() {
  if (!selectedSlot) return;

  const selectedFriend = friends.find((friend) => friend.id === selectedFriendId);

  if (!selectedFriend) {
    alert("Please select your name first.");
    return;
  }

  await supabase.from("hosts").delete().eq("slot", selectedSlot);

  await supabase.from("hosts").insert([
    {
      slot: selectedSlot,
      host_name: selectedFriend.name,
      host_address: "",
    },
  ]);

  setHosts({
    ...hosts,
    [selectedSlot]: selectedFriend.name,
  });
}

  const selectedAvailable = selectedSlot ? availableFriends(selectedSlot) : [];
  const host = selectedSlot ? friends.find((friend) => friend.id === hosts[selectedSlot]) : null;

  return (
  <main
  className="app-shell"
  style={{
    fontFamily: "Arial, sans-serif",
  }}
>

 

    <div
      style={{
    position: "relative",
    marginBottom: 24,
    borderRadius: 20,
    overflow: "hidden",
  }}
>
<img
  src="/mahjong-header-4.png"
 style={{
  width: "100%",
  maxWidth: 850,
  height: "auto",
  display: "block",
  borderRadius: 20,
  margin: "0 auto",
}}
/>

  <div
    style={{
      position: "absolute",
      inset: 0,
      background: "transparent",
      display: "flex",
      flexDirection: "column",
      justifyContent: "flex-end",
      padding: 24,
    }}
  >
 

  
  </div>
</div>
<div style={{ marginBottom: 18 }}>
  <h2 style={{ marginBottom: 6, color: "red", fontWeight: "bold" }}>
  STEP 1 - REGISTER HERE if you&apos;d like to join our group.
</h2>

  
</div>
     
      <div style={{ marginBottom: 20 }}>
  <input
    placeholder="Player name"
    value={newName}
    onChange={(e) => setNewName(e.target.value)}
    style={{ padding: 8, marginRight: 8 }}
  />

  <input
    placeholder="Phone number"
    value={newPhone}
    onChange={(e) => setNewPhone(e.target.value)}
    style={{ padding: 8, marginRight: 8 }}
  />

  <button
style={actionButtonStyle}
onClick={async () => {
  
  if (!newName.trim()) {
 
  return;
}

  const { data, error } = await supabase
  .from("players")
 .insert([
  {
    name: newName.trim(),
    Name: newPhone.trim()
  }
]);

 if (error) {
  alert(error.message);
  return;
}

const newPlayer = {
  id: crypto.randomUUID(),
  name: newName.trim(),
  phone: newPhone.trim(),
};

  setFriends([...friends, newPlayer].sort((a, b) => a.name.localeCompare(b.name)));
  setNewName("");
  setNewPhone("");
}}
  >
    Add Player
  </button>
</div>


<p>
  <span style={{ color: "red", fontWeight: "bold" }}>
    STEP 2 - SCROLL RIGHT</span> to select your name
  
  {" "}from the row below, then CLICK on times you are available in a minimum of 3 30-MINUTE BLOCKS (a 90-min block of time).
  <br />
  Click a selected time again to remove yourself from play/hosting.
  <br />
  <span style={{ color: "red", fontWeight: "bold" }}>
  SCROLL DOWN
</span>
{" "}after selecting a time to sign up to host.
</p>
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          overflowX: "auto",
          paddingBottom: 8,
          whiteSpace: "nowrap",
        }}
      >
      {[...friends]
  .sort((a, b) =>
    a.name.localeCompare(b.name)
  )
  .map((friend) => (
        <button
          key={friend.id}
          onClick={() => setSelectedFriendId(friend.id)}
          style={{
            padding: "10px 14px",
            borderRadius: 20,
            border: "1px solid #999",
            background: selectedFriendId === friend.id ? "#123" : "#eee",
            color: selectedFriendId === friend.id ? "white" : "black",
            flex: "0 0 auto",
          }}
        >
          {friend.name}
        </button>
      ))}
      </div>

      <div className="schedule-full-width">
      <h2 className="schedule-heading">Schedule</h2>
      <div className="schedule-controls" style={{ marginBottom: 12 }}>
  <button onClick={() => setWeekOffset(weekOffset - 1)}>← Previous Week</button>
  <button onClick={() => setWeekOffset(weekOffset + 1)} style={{ marginLeft: 10 }}>
    Next Week →
  </button>
</div>
      <div style={{ width: "100%" }}>
        <table style={{ borderCollapse: "collapse", tableLayout: "fixed", width: "100%" }}>
          <thead>
            <tr>
              <th style={cellStyle}>Time</th>
              {days.map((day) => (
                <th key={day} style={cellStyle}>{day}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {times.map((time) => (
              <tr key={time}>
                <td style={cellStyle}>{time}</td>
                {days.map((day) => {
                  const slot = `${day} ${time}`;
                  const count = countAvailable(slot);
                  const mine = availability[selectedFriendId]?.includes(slot);
                  const hasHost = hosts[slot];

                  return (
                    <td
                      key={slot}
onClick={() => {
  const current = availability[selectedFriendId] || [];
  const alreadySelected = current.includes(slot);

  toggleSlot(slot);

  setSelectedSlot(slot);

  if (!alreadySelected) {
    setShowPopup(true);
  }
}}



                      style={{
                        ...cellStyle,
                        cursor: "pointer",
background:
  mine
    ? "#b7d7ff"
    : count >= 4
    ? "#b7eb8f"
    : count === 3
    ? "#ffe7ba"
    : count === 2
    ? "#fff1b8"
    : count === 1
    ? "#fffbe6"
    : "white",
                      }}
                    >
                      <strong>{count}/8</strong>
                      <br />
 {hasHost
  ? `🏠 ${hosts[slot]?.split(" ")[0]}`
  : count >= 4
  ? "Host needed"
  : "Open"}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      </div>

      {selectedSlot && (
        <section style={{ marginTop: 20, padding: 15, border: "1px solid #ccc", borderRadius: 12 }}>
          <h2>{selectedSlot}</h2>
          <p>Players available: {selectedAvailable.length}/8</p>

          {selectedAvailable.length >= 4 && !host && (
            <div style={{ background: "#fff1b8", padding: 12, borderRadius: 10 }}>
              <strong>This game has enough players.</strong>
              
             
            </div>
          )}

  {!hosts[selectedSlot] && (
  <div
    style={{
      background: "#fff1b8",
      padding: 12,
      borderRadius: 10,
    }}
  >
    

   <p><strong>I can host this game</strong></p>

    <input
      placeholder="Your name"
      value={hostName}
      onChange={(e) => setHostName(e.target.value)}
      style={{
        width: "100%",
        padding: 4,
        marginBottom: 4,
        borderRadius: 6,
      }}
    />

    <input
      placeholder="Host address"
      value={hostAddress}
      onChange={(e) => setHostAddress(e.target.value)}
      style={{
        width: "100%",
       padding: 4,
        marginBottom: 4,
        borderRadius: 6,
      }}
    />

    <button
      style={fullActionButtonStyle}
      onClick={() => {
 const updatedHosts = { ...hosts };
const updatedHostAddresses = { ...hostAddresses };

const currentSlots = availability[selectedFriendId] || [];

const selectedIndex = times.findIndex((time) =>
  selectedSlot.endsWith(time)
);

const selectedDay = selectedSlot.replace(` ${times[selectedIndex]}`, "");

const contiguousSlots = [selectedSlot];

// look backward
for (let i = selectedIndex - 1; i >= 0; i--) {
  const slot = `${selectedDay} ${times[i]}`;
  if (currentSlots.includes(slot)) {
    contiguousSlots.push(slot);
  } else {
    break;
  }
}

// look forward
for (let i = selectedIndex + 1; i < times.length; i++) {
  const slot = `${selectedDay} ${times[i]}`;
  if (currentSlots.includes(slot)) {
    contiguousSlots.push(slot);
  } else {
    break;
  }
}

contiguousSlots.forEach(async (slot) => {
  updatedHosts[slot] = hostName;
  updatedHostAddresses[slot] = hostAddress;

  await supabase.from("hosts").delete().eq("slot", slot);

  await supabase.from("hosts").insert([
    {
      slot: slot,
      host_name: hostName,
      host_address: hostAddress,
    },
  ]);
});


  setHosts(updatedHosts);
  setHostAddresses(updatedHostAddresses);

  localStorage.setItem("mahjongHosts", JSON.stringify(updatedHosts));
  localStorage.setItem("mahjongHostAddresses", JSON.stringify(updatedHostAddresses));
  setHostName("");
setHostAddress("");
  
}}
    >
      Save Host
    </button>
  </div>
)}
  {hosts[selectedSlot] && (
  <div style={{ background: "#c8f7d2", padding: 12, borderRadius: 10 }}>
    <strong>Host: {hosts[selectedSlot]}</strong>
   

    <p><strong>Host address:</strong></p>

    

    {hostAddresses[selectedSlot] && (
      <p>{hostAddresses[selectedSlot]}</p>
    )}
  </div>
)}
         <h3>Available players for this time</h3>
          {selectedAvailable.map((friend) => (
            <div
              key={friend.id}
              style={{
                borderBottom: "1px solid #eee",
                display: "flex",
                gap: 12,
                justifyContent: "space-between",
                padding: "8px 0",
              }}
            >
              <strong>{friend.name}</strong>
              {friend.phone ? (
                <a href={`tel:${friend.phone}`}>{friend.phone}</a>
              ) : (
                <span style={{ color: "#666" }}>No phone listed</span>
              )}
            </div>
          ))}
          {availability[selectedFriendId]?.includes(selectedSlot) && (
  <button
 
    onClick={() => {
  const current = availability[selectedFriendId] || [];
  const selectedFriend = friends.find((f) => f.id === selectedFriendId);

  const selectedIndex = times.findIndex((time) =>
    selectedSlot.endsWith(time)
  );

  const selectedDay = selectedSlot.replace(` ${times[selectedIndex]}`, "");

  const slotsToRemove = [selectedSlot];

  for (let i = selectedIndex - 1; i >= 0; i--) {
    const slot = `${selectedDay} ${times[i]}`;
    if (current.includes(slot)) {
      slotsToRemove.push(slot);
    } else {
      break;
    }
  }

  for (let i = selectedIndex + 1; i < times.length; i++) {
    const slot = `${selectedDay} ${times[i]}`;
    if (current.includes(slot)) {
      slotsToRemove.push(slot);
    } else {
      break;
    }
  }

  const updatedAvailability = {
    ...availability,
    [selectedFriendId]: current.filter(
      (item) => !slotsToRemove.includes(item)
    ),
  };

  const updatedHosts = { ...hosts };
  const updatedHostAddresses = { ...hostAddresses };

  if (selectedFriend) {
    const selectedFirstName = selectedFriend.name
      .split(" ")[0]
      .toLowerCase();

    slotsToRemove.forEach((slot) => {
      const hostFirstName = updatedHosts[slot]
        ?.split(" ")[0]
        .toLowerCase();

      if (hostFirstName === selectedFirstName) {
        delete updatedHosts[slot];
        delete updatedHostAddresses[slot];
      }
    });
  }

  setAvailability(updatedAvailability);
  setHosts(updatedHosts);
  setHostAddresses(updatedHostAddresses);

  localStorage.setItem(
    "mahjongAvailability",
    JSON.stringify(updatedAvailability)
  );
  localStorage.setItem("mahjongHosts", JSON.stringify(updatedHosts));
  localStorage.setItem(
    "mahjongHostAddresses",
    JSON.stringify(updatedHostAddresses)
  );
}}
style={{
  background: "#f8f8f8",
  color: "#666",
  fontSize: "12px",
  padding: "4px 8px",
  border: "1px solid #ccc",
  borderRadius: 6,
  cursor: "pointer",
  marginTop: 8,
}}
>
  Remove myself from this game
  </button>
)}
        </section>
      )}
    
    </main>
  );
}

const cellStyle: React.CSSProperties = {
  border: "1px solid #ccc",
  fontSize: "var(--schedule-cell-font-size)",
  overflowWrap: "anywhere",
  padding: "var(--schedule-cell-padding)",
  textAlign: "center",
};

const actionButtonStyle: React.CSSProperties = {
  background: "#123",
  border: "1px solid #123",
  borderRadius: 8,
  boxShadow: "0 2px 6px rgba(0, 0, 0, 0.18)",
  color: "white",
  cursor: "pointer",
  fontWeight: 700,
  minHeight: 38,
  padding: "9px 14px",
};

const fullActionButtonStyle: React.CSSProperties = {
  ...actionButtonStyle,
  marginTop: 4,
  width: "100%",
};
