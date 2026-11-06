const axios = require("axios");
const repo = require("./notificationRepository");

const preferenceByType = {
  ride:"ride_notifications", booking:"booking_notifications",
  parcel:"parcel_notifications", payment:"payment_notifications",
  chat:"chat_notifications", promotion:"promotional_notifications"
};

exports.registerDevice = async (userId, body) => {
  const token=String(body.expo_push_token || "").trim();
  const type=String(body.device_type || "").toLowerCase();
  if (!/^(ExponentPushToken|ExpoPushToken)\[.+\]$/.test(token))
    throw new Error("A valid Expo push token is required");
  if (!["android","ios"].includes(type))
    throw new Error("device_type must be android or ios");
  return repo.registerDevice({userId,token,type,name:body.device_name});
};

exports.createAndSend = async (n) => {
  if (!n.userId || !n.title || !n.message || !n.type) return null;
  const id=await repo.create(n); // Persist inbox notification first.
  try {
    const prefs=await repo.preferences(n.userId);
    const pref=preferenceByType[String(n.type).toLowerCase()];
    if (Number(prefs.push_enabled)!==1 || (pref && Number(prefs[pref])!==1)) return id;
    const devices=await repo.devices(n.userId);
    const messages=devices.map(d=>({
      to:d.expo_push_token, sound:"default", title:n.title, body:n.message,
      data:{...(n.data || {}),notificationId:id}, priority:"high", channelId:"default"
    }));
    for(let i=0;i<messages.length;i+=100) {
      try {
        await axios.post("https://exp.host/--/api/v2/push/send",messages.slice(i,i+100),{
          headers:{"Content-Type":"application/json",Accept:"application/json"},timeout:12000
        });
      } catch(e) { console.error("Expo push delivery failed:",e.response?.data || e.message); }
    }
  } catch(e) { console.error("Notification processing failed:",e.message); }
  return id;
};
exports.unregisterDevice=(userId,id)=>repo.deactivateDevice(userId,id);
exports.unregisterToken=(userId,token)=>repo.deactivateToken(userId,token);
exports.getPreferences=(userId)=>repo.preferences(userId);
exports.updatePreferences=(userId,body)=>repo.updatePreferences(userId,body);
exports.getNotifications=async(userId,query)=>{
  const limit=Math.min(Math.max(parseInt(query.limit,10)||20,1),50);
  const page=Math.max(parseInt(query.page,10)||1,1);
  const [notifications,unreadCount]=await Promise.all([
    repo.list(userId,limit,(page-1)*limit),repo.unread(userId)
  ]);
  return {notifications,unreadCount,page,limit};
};
exports.unread=(userId)=>repo.unread(userId);
exports.markRead=(userId,id)=>repo.markRead(userId,id);
exports.markAllRead=(userId)=>repo.markAllRead(userId);
