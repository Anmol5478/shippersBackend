const service=require("./notificationService");
const uid=req=>req.user?.user_id;
const ok=(res,data,message="Success")=>res.json({responseCode:"00",success:true,message,data});
const fail=(res,e,status=400)=>res.status(status).json({responseCode:"01",success:false,message:e.message});
exports.register=async(req,res)=>{try{return ok(res,await service.registerDevice(uid(req),req.body||{}),"Device registered");}catch(e){return fail(res,e);}};
exports.unregister=async(req,res)=>{try{
  const done=req.params.deviceId ? await service.unregisterDevice(uid(req),req.params.deviceId) : await service.unregisterToken(uid(req),req.body?.expo_push_token);
  return ok(res,{deactivated:done},done?"Device unregistered":"Device not found");
}catch(e){return fail(res,e);}};
exports.list=async(req,res)=>{try{return ok(res,await service.getNotifications(uid(req),req.query));}catch(e){return fail(res,e,500);}};
exports.unread=async(req,res)=>{try{return ok(res,{unreadCount:await service.unread(uid(req))});}catch(e){return fail(res,e,500);}};
exports.read=async(req,res)=>{try{const done=await service.markRead(uid(req),req.params.notificationId);return done?ok(res,null,"Marked as read"):res.status(404).json({responseCode:"01",success:false,message:"Notification not found"});}catch(e){return fail(res,e,500);}};
exports.readAll=async(req,res)=>{try{return ok(res,{updatedCount:await service.markAllRead(uid(req))},"All notifications marked as read");}catch(e){return fail(res,e,500);}};
exports.preferences=async(req,res)=>{try{return ok(res,await service.getPreferences(uid(req)));}catch(e){return fail(res,e,500);}};
exports.updatePreferences=async(req,res)=>{try{return ok(res,await service.updatePreferences(uid(req),req.body||{}),"Preferences updated");}catch(e){return fail(res,e);}};
