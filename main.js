const http = require('http');

// Create a server object
http.createServer((req, res) => {
  res.write('Hello World!'); // Write a response to the client
  res.end(); // End the response
}).listen(8080); // The server object listens on port 8080



require('dotenv').config(); 
const { Telegraf, session, Extra, Markup, Scenes } = require('telegraf');
const { BaseScene, Stage } = Scenes;
const { enter, leave } = Stage
const stage = new Stage()
const rateLimit = require('telegraf-ratelimit');
require('dotenv').config();
const mongo = require('mongodb').MongoClient;


const {
    BOT_TOKEN,
    ADMIN_IDS,
    CURRENCY,
    MONGODB_URL,
} = process.env;

const curr = CURRENCY;
const admins = ADMIN_IDS.split(',').map(Number); 
const mongoUrl = MONGODB_URL;
const bot = new Telegraf(BOT_TOKEN); 

//Scenes Register 

const getwallet = new BaseScene('getwallet')
stage.register(getwallet)
const onwith = new BaseScene('onwith')
stage.register(onwith)
const mini = new BaseScene('mini')
stage.register(mini)
const max = new BaseScene('max')
stage.register(max)
const tax = new BaseScene('tax')
stage.register(tax)
const comment = new BaseScene('comment')
stage.register(comment)
const addcha = new BaseScene('addcha')
stage.register(addcha)
const rcha = new BaseScene('rcha')
stage.register(rcha)
const getref = new BaseScene('getref')
stage.register(getref)
const chabal = new BaseScene('chabal')
stage.register(chabal)
const getdetails = new BaseScene('getdetails')
stage.register(getdetails)
const paycha = new BaseScene('paycha')
stage.register(paycha)
const broad = new BaseScene('broad')
stage.register(broad)

function senderr(e){
    try{
        for (const i of admins){
            bot.telegram.sendMessage(i,"*🥲 Wtf! Error Happened In Bot:\n\n"+e+"\n\nDon't Panic Bot Will Not Stop*",{parse_mode:'Markdown'})
        }
    }catch(err){
        console.log(err)
    }
}

const buttonsLimit = {
    window: 1000,
    limit: 1,
    onLimitExceeded: (ctx, next) => {
      if ('callback_query' in ctx.update)
      ctx.answerCbQuery('😅 Please Dont Press Buttons Quikly , Try Again...', true)
        .catch((err) => sendError(err, ctx))
    },
    keyGenerator: (ctx) => {
      return ctx.callbackQuery ? true : false
    }
  }
  bot.use(rateLimit(buttonsLimit))

bot.use(session())
bot.use(stage.middleware())

let db;

mongo.connect(mongoUrl, { useUnifiedTopology: true }, (err, client) => {
    if (err) {
        console.log(err);
    }
    db = client.db(BOT_TOKEN.split(':')[0]); // Use BOT_TOKEN from env
    bot.launch().then(console.log('Bot Hosted On Server Try To Send /start'));
});

//Just Main Menu Keyboard
let mainkey = [
    ['💰 Account','👫 Invite'],
    ['📊 Statistics'],
    ['🗂️ UPI id','💵 Withdraw']
]

const botstart = async (ctx) =>{
    try{
        bot.telegram.sendChatAction(ctx.from.id,'typing').catch((err) => console.log(err))
        let admin = await db.collection('admin').find({admin:'admin'}).toArray()
        if (!(admin.length)){
            let botData = {admin:'admin',ref:1,mini:2,max:4,paycha:'@payment_logs',botstat:'Active',withstat:'On',subid:'Not Set',mid:'NOT SET',mkey:'NOT SET',comment:'NOT SET',tax:0,channels:[]}
            db.collection('admin').insertOne(botData)
            ctx.replyWithMarkdown("*👀 Bot Data Saved In Database Try To Restart Bot /start*")
            return
        }
        if(ctx.message.chat.type != 'private'){
            return
        }
        let botstat = admin[0].botstat
        if (botstat != 'Active'){
            ctx.replyWithMarkdown('*⛔ Currently Bot Is Under Maintenance*')
            return
        }
        let uData = await db.collection('info').find({user:ctx.from.id}).toArray()
        if (!(uData.length)){
            db.collection('withdraw').insertOne({user:ctx.from.id,'toWith':0})
            db.collection('info').insertOne({user:ctx.from.id})
            let ref = ctx.startPayload * 1
            let rData = await db.collection('refer').find({user:ctx.from.id}).toArray()
            if((ref) && ctx.from.id != ref && !('invited' in rData) && !(isNaN(ref))){
                db.collection('refer').insertOne({user:ctx.from.id,'invited':ref})
            }else{
                db.collection('refer').insertOne({user:ctx.from.id,'invited':"None",'kid':true})
            }
        }
        let text = "*🚧Share Your Contact Number To Verify Yourself\n\n*_⚠️ we are just verifing that you are indian user or not_"
        bot.telegram.sendMessage(ctx.from.id,text,{parse_mode:'Markdown',reply_markup:{keyboard:[[{text:"📤 Send Contact",request_contact:true}]],resize_keyboard: true}})
    }catch(e){
        console.log(e)
senderr(e)
    }
}
bot.start(botstart)


bot.on('contact',async (ctx) =>{
    try{
        bot.telegram.sendChatAction(ctx.from.id,'typing').catch((err) => console.log(err))
        var cont = ctx.update.message.contact.phone_number

        // Save the phone number in MongoDB
        db.collection('info').updateOne({user:ctx.from.id},{$set:{phoneNumber:cont}})
        
    if (ctx.update.message.forward_from){
      bot.telegram.sendMessage(ctx.from.id,"*❌ Not Your Contact*",{parse_mode:"markdown"})
      return
    }
    if(!(ctx.update.message.contact.first_name == ctx.from.first_name)){
        ctx.replyWithMarkdown("*❌ Not Your Contact*")
        return
    }
      if(!(ctx.message.reply_to_message)){
        ctx.replyWithMarkdown("*❌ Not Your Contact*")
        return
    }
    if(cont.startsWith("91") || cont.startsWith("+91")){
        db.collection('info').updateOne({user:ctx.from.id},{$set:{verified:true}})
        let admin = await db.collection('admin').find({admin:'admin'}).toArray()
        if(ctx.message.chat.type != 'private'){
            return
        }
        let botstat = admin[0].botstat
        if (botstat != 'Active'){
            ctx.replyWithMarkdown('*⛔ Currently Bot Is Under Maintenance*')
            return
        }
        let checkJoined = await joinCheck(ctx.from.id,admin)
        if(!checkJoined){
            sendJoined(ctx,admin)
            return
        }
        let uData = await db.collection('refer').find({user:ctx.from.id}).toArray()
        if (!('kid' in uData[0]) && ('invited' in uData[0])){
            await db.collection('refer').updateOne({user:ctx.from.id},{$set:{'kid':true}})
            let refid = uData[0].invited
            let rData = await db.collection('info').find({user:refid}).toArray()
            if(!(rData.length)){
                db.collection('refer').updateOne({user:ctx.from.id},{$set:{'invited':'None'}})
                ctx.replyWithMarkdown("*🚸 Wrong Refer Link *")
                return
            }
            if (!('balance' in rData[0])){
                var bal = 0;
            }else{
                var bal = rData[0].balance
            }
            let PerRef = admin[0].ref
            let final = parseFloat(bal) + parseFloat(PerRef)
            db.collection('info').updateOne({user:refid},{$set:{'balance':final}})
            ctx.replyWithMarkdown("*🟢 You Are Referred By:*\n["+refid+"](tg://user?id="+refid+")")
            bot.telegram.sendMessage(refid,"*💰 Refer Successfully Completed By:\t\t*["+ctx.from.id+"](tg://user?id="+ctx.from.id+")\n*Reward Added To Your Account*",{parse_mode:'Markdown'})
        }
        starter(ctx)
    }
    }catch(e){
        console.log(e)
senderr(e)
    }
})

//Joined Button Code
bot.hears('🟢 Joined', async (ctx)=>{
    try{
        if(ctx.message.chat.type != 'private'){
            return
        }
        bot.telegram.sendChatAction(ctx.from.id,'typing').catch((err) => console.log(err))
        let admin = await db.collection('admin').find({admin:'admin'}).toArray()
        let botstat = admin[0].botstat
        if (botstat != 'Active'){
            ctx.replyWithMarkdown('*⛔ Currently Bot Is Under Maintenance*')
            return
        }
        let checkJoined = await joinCheck(ctx.from.id,admin)
        if(!checkJoined){
            sendJoined(ctx,admin)
            return
        }
        let data = await db.collection('info').find({user:ctx.from.id}).toArray()

        if (!('verified' in data[0])){

            botstart(ctx)

            return

        }
        let uData = await db.collection('refer').find({user:ctx.from.id}).toArray()
        if (!('kid' in uData[0]) && ('invited' in uData[0])){
            await db.collection('refer').updateOne({user:ctx.from.id},{$set:{'kid':true}})
            let refid = uData[0].invited
            let rData = await db.collection('info').find({user:refid}).toArray()
            if(!(rData.length)){
                db.collection('refer').updateOne({user:ctx.from.id},{$set:{'invited':'None'}})
                ctx.replyWithMarkdown("*🚸 Wrong Refer Link *")
                return
            }
            if (!('balance' in rData[0])){
                var bal = 0;
            }else{
                var bal = rData[0].balance
            }
            let PerRef = admin[0].ref
            let final = parseFloat(bal) + parseFloat(PerRef)
            db.collection('info').updateOne({user:refid},{$set:{'balance':final}})
            ctx.replyWithMarkdown("*🟢 You Are Referred By:*\n["+refid+"](tg://user?id="+refid+")")
            bot.telegram.sendMessage(refid,"*💰 Refer Successfully Completed By:\t\t*["+ctx.from.id+"](tg://user?id="+ctx.from.id+")\n*Reward Added To Your Account*",{parse_mode:'Markdown'})
        }
        starter(ctx)
    }catch(e){
        console.log(e)
senderr(e)

    }
})

//Account Info Button Code
bot.hears('💰 Account' , async (ctx) =>{
    try{
        bot.telegram.sendChatAction(ctx.from.id,'typing').catch((err) => console.log(err))
        let admin = await db.collection('admin').find({admin:'admin'}).toArray()
        if(ctx.message.chat.type != 'private'){
            return
        }
        let botstat = admin[0].botstat
        if (botstat != 'Active'){
            ctx.replyWithMarkdown('*⛔ Currently Bot Is Under Maintenance*')
            return
        }
        let data = await db.collection('info').find({user:ctx.from.id}).toArray()
        if (!('verified' in data[0])){
            botstart(ctx)
            return
        }
        let checkJoin = await joinCheck(ctx.from.id,admin)
        if(!checkJoin){
            sendJoined(ctx,admin)
            return
        }
        if (!('balance' in data[0])){
            var bal =0;
        }else{
            var bal = data[0].balance
        }
        if (!('userUPI' in data[0])){
            var userUPI = 'None'
        }else{
            var userUPI = data[0].userUPI
        }
        let text = "*💁User = "+ctx.from.first_name+"\n\n💰 Your Balance = "+bal.toFixed(3)+" "+curr+"\n\n🗂️UPI = *`"+userUPI+"`"
        ctx.replyWithMarkdown(text)
    }catch(e){
        console.log(e)
senderr(e)
    }
})

//Invite Button Code
bot.hears('👫 Invite', async (ctx)=>{
    try{
        bot.telegram.sendChatAction(ctx.from.id,'typing').catch((err) => console.log(err))
        let admin = await db.collection('admin').find({admin:'admin'}).toArray()
        if(ctx.message.chat.type != 'private'){
            return
        }
        let botstat = admin[0].botstat
        if (botstat != 'Active'){
            ctx.replyWithMarkdown('*⛔ Currently Bot Is Under Maintenance*')
            return
        }
        let data = await db.collection('info').find({user:ctx.from.id}).toArray()
        if (!('verified' in data[0])){
            botstart(ctx)
            return
        }
        let checkJoin = await joinCheck(ctx.from.id,admin)
        if(!checkJoin){
            sendJoined(ctx,admin)
            return
        }
        let text = "*🙌  User = "+ctx.from.first_name+"\n\n🙌 Refer Link = https://t.me/"+bot.botInfo.username+"?start="+ctx.from.id+"\n\n🚀 Invite And Earn: "+admin[0].ref.toFixed(3)+" "+curr+" *"
        ctx.replyWithMarkdown(text)
    }catch(e){
        console.log(e)
senderr(e)
    }
})

bot.hears('📊 Statistics',async (ctx) =>{
    try{
        bot.telegram.sendChatAction(ctx.from.id,'typing').catch((err) => console.log(err))
        let admin = await db.collection('admin').find({admin:'admin'}).toArray()
        if(ctx.message.chat.type != 'private'){
            return
        }
        let botstat = admin[0].botstat
        if (botstat != 'Active'){
            ctx.replyWithMarkdown('*⛔ Currently Bot Is Under Maintenance*')
            return
        }
        let data = await db.collection('info').find({user:ctx.from.id}).toArray()
        if (!('verified' in data[0])){
            botstart(ctx)
            return
        }
        let checkJoin = await joinCheck(ctx.from.id,admin)
        if(!checkJoin){
            sendJoined(ctx,admin)
            return
        }
        let users = await db.collection('info').find({},{projection:{user:1,'_id':0}}).toArray()
        let payout = await db.collection('admin').find({Payout:'Payout'}).toArray()
        if(payout.length == 0){
            var final = 0;
        }else{
            var final = payout[0].value
        }
        //
        let text = "*📊Bot Live Status Here\n\n📤 Total Payouts: "+final.toFixed(3)+" "+curr+"\n\n🙇 Total Users: "+users.length+" Users\n\n✅ Made By* ["+process.env.CREATOR_NAME+"](https://t.me/"+process.env.CREATOR_USER+")"
        ctx.replyWithMarkdown(text)
    }catch(e){
        senderr(e)
        console.log(e)
    }
})
//Wallet or upi Button Code
bot.hears('🗂️ UPI id', async (ctx) =>{
    try{
        let admin = await db.collection('admin').find({admin:'admin'}).toArray()
        if(ctx.message.chat.type != 'private'){
            return
        }
        let botstat = admin[0].botstat
        if (botstat != 'Active'){
            ctx.replyWithMarkdown('*⛔ Currently Bot Is Under Maintenance*')
            return
        }
        let data = await db.collection('info').find({user:ctx.from.id}).toArray()
        if (!('verified' in data[0])){
            botstart(ctx)
            return
        }
        let checkJoin = await joinCheck(ctx.from.id,admin)
        if(!checkJoin){
            sendJoined(ctx,admin)
            return
        }
        ctx.replyWithMarkdown("*💡 Send Your UPI id*",{reply_markup:{keyboard:[
            ['🔙 Back']
        ],resize_keyboard:true}})
        await ctx.scene.enter('getwallet')
    }catch(e){
        senderr(e)
        console.log(e)
    }
})

//Set Wallet Scene
getwallet.on('text', async (ctx) =>{
    try{
        const name = 'getwallet'
        if (ctx.message.text == '🔙 Back'){
            starter(ctx)
            await ctx.scene.leave(name)
            return
        }else if(!ctx.message.text.includes('@')){
            ctx.replyWithMarkdown("*🚫 Not A Valid UPI ID*",{reply_markup:{keyboard:mainkey,resize_keyboard:true}})
            await ctx.scene.leave(name)
            return
        }else{
            db.collection('info').updateOne({user:ctx.from.id},{$set:{'userUPI':ctx.message.text}})
            ctx.replyWithMarkdown("*✅ Your UPI ID Updated To "+ctx.message.text+"*",{reply_markup:{keyboard:mainkey,resize_keyboard:true}})
            await ctx.scene.leave(name)
        }
    }catch(e){
        senderr(e)
        console.log(e)
    }
})

//Withdraw Button Code
bot.hears('💵 Withdraw',async (ctx) =>{
    try{
    bot.telegram.sendChatAction(ctx.from.id,'typing').catch((err) => console.log(err))
    let admin = await db.collection('admin').find({admin:'admin'}).toArray()
    if(ctx.message.chat.type != 'private'){
        return
    }
    let botstat = admin[0].botstat
    if (botstat != 'Active'){
        ctx.replyWithMarkdown('*⛔ Currently Bot Is Under Maintenance*')
        return
    }
    let withstat = admin[0].withstat
    if(withstat != 'On'){
        ctx.replyWithMarkdown('*⛔ Currently Withdrawls Are Not Avaible*')
        return
    }
    let data = await db.collection('info').find({user:ctx.from.id}).toArray()
    if (!('verified' in data[0])){
        botstart(ctx)
        return
    }
    let checkJoin = await joinCheck(ctx.from.id,admin)
    if(!checkJoin){
        sendJoined(ctx,admin)
        return
    }
    if(!('balance' in data[0])){
        var bal = 0;
    }else{
        var bal = data[0].balance
    }
    let mini = admin[0].mini
    if (parseFloat(bal) < parseFloat(mini)){
        ctx.replyWithMarkdown('*⚠️ Must Own AtLeast '+mini.toFixed(3)+' '+curr+'*')
        return
    }
    if(!('userUPI' in data[0])){
        ctx.replyWithMarkdown('*⛔️ UPI id is Not Set*')
        return
    }
    ctx.replyWithMarkdown("*💡 Send Amount To Withdraw*",{reply_markup:{keyboard:[
        ['🔙 Back']
    ],resize_keyboard:true}})
    await ctx.scene.enter('onwith')
    }catch(e){
        senderr(e)
        console.log(e)
    }
})

onwith.on('text',async (ctx) =>{
    try{
        const name = 'onwith'
        var admin = await db.collection('admin').find({admin:'admin'}).toArray()
        var data = await db.collection('info').find({user:ctx.from.id}).toArray()
        let mini = admin[0].mini
        if (ctx.message.text == '🔙 Back'){
            starter(ctx)
            await ctx.scene.leave(name)
            return
        }else if(isNaN(ctx.message.text)){
            ctx.replyWithMarkdown("*🚫 Not A Valid Amount*",{reply_markup:{keyboard:mainkey,resize_keyboard:true}})
            await ctx.scene.leave(name)
            return
        
        }else if(parseFloat(mini) > parseFloat(ctx.message.text)){
            ctx.replyWithMarkdown("*⚠️ Minimum Withdraw Is "+mini+" "+curr+"*",{reply_markup:{keyboard:mainkey,resize_keyboard:true}})
            await ctx.scene.leave(name)
            return
        }else if(parseFloat(ctx.message.text) > parseFloat(data[0].balance)){
            ctx.replyWithMarkdown("*⚠️ You Did Not Have Enough Balance*",{reply_markup:{keyboard:mainkey,resize_keyboard:true}})
            await ctx.scene.leave(name)
            return
        }else if(parseFloat(ctx.message.text) > parseFloat(admin[0].max)){
            ctx.replyWithMarkdown("*⛔️ Maximum Withdraw Is "+admin[0].max+" "+curr+"*",{reply_markup:{keyboard:mainkey,resize_keyboard:true}})
            await ctx.scene.leave(name)
            return
        } else if (ctx.message.forward_from){
            ctx.replyWithMarkdown("*🚫 Forwards Not Allowed*",{reply_markup:{keyboard:mainkey,resize_keyboard:true}})
            await ctx.scene.leave(name)
            return
        } else{
            await ctx.scene.leave(name)
            await db.collection('withdraw').updateOne({user:ctx.from.id},{$set:{'toWith':parseFloat(ctx.message.text)}})
            let text = "*🚨 Withdrawal Request Confirmation\n\n💰 Amount: "+ctx.message.text+" "+curr+"\n🗂️UPI id:* `"+data[0].userUPI+"`*\n\n🟢Click On '✅ Continue' To Confirm*"
            ctx.replyWithMarkdown(text,{reply_markup:{inline_keyboard:[
                [{text:'✅ Continue',callback_data:'continue'},{text:'⛔️ Reject',callback_data:'reject'}]
            ]}})            
        }
    }catch(e){
        senderr(e)
        console.log(e)
    }
})

bot.action('reject', async (ctx) =>{
    try{
        await db.collection('withdraw').updateOne({user:ctx.from.id},{$set:{'toWith':0}})
        await ctx.deleteMessage()
        ctx.replyWithMarkdown("*🚫 Withdrawal Cancelled*",{reply_markup:{keyboard:mainkey,resize_keyboard:true}})
    }catch(e){
        console.log(e)
        senderr(e)
    }
})

bot.action('continue',async (ctx) =>{
    try{
        await ctx.deleteMessage()  
        let wData = await db.collection('withdraw').find({user:ctx.from.id}).toArray()
        await db.collection('withdraw').updateOne({user:ctx.from.id},{$set:{'toWith':0}})      
        var toWith = wData[0].toWith * 1
        if(toWith == 0){            
            ctx.replyWithMarkdown("\\*❌No Amount Available For Withdrawal\\*",{reply_markup:{keyboard:mainkey,resize_keyboard:true}})
            return
        }
        let uData = await db.collection('info').find({user:ctx.from.id}).toArray()
        var bal = uData[0].balance * 1
        if(bal < toWith){
            ctx.replyWithMarkdown("\\*❌Withdrawal Failed\\*",{reply_markup:{keyboard:mainkey,resize_keyboard:true}})
            return
        }
        let admin = await db.collection('admin').find({admin:'admin'}).toArray()
        let tax = admin[0].tax * 1 
        let finalamo = (toWith/100) * tax
        let amo =  parseFloat(toWith - finalamo)
        var finalBal = parseFloat(bal) - parseFloat(toWith)
        db.collection('info').updateOne({user:ctx.from.id},{$set:{'balance':finalBal}})
        
        // Log the user ID who requested the withdrawal
        console.log(`User with ID ${ctx.from.id} requested a withdrawal.`);
        
        // Removed API call and added manual message
        var text = "\\*🟢 Withdraw Request Processed 🟢\\*\n\n💰 Amount: "+toWith+" "+curr+" (Tax : %"+tax+")\n🗂️ You will receive your payment soon."
        ctx.replyWithMarkdown(text,{reply_markup:{keyboard:mainkey,resize_keyboard:true}})
        
        // Send a message to the payment log channel
        var userIdentifier = ctx.from.username ? `@${ctx.from.username}` : `ID ${ctx.from.id}`;

        // Retrieve the user's UPI ID from the database
        var userUPI = await db.collection('info').findOne({ user: ctx.from.id }).then(doc => doc.userUPI);

        var logText = `User with ${userIdentifier} requested a withdrawal of ${toWith} ${curr}. After applying a tax of ${tax}%, the final amount is ${amo} ${curr}. The UPI ID for the transaction is ${userUPI}.`
        ctx.telegram.sendMessage('@payment_logs', logText)
        
        let pData = await db.collection('admin').find({Payout:'Payout'}).toArray()
        if(!pData.length){
            var TPay = 0;
            db.collection('admin').insertOne({Payout:'Payout',value:TPay})
        }else{
            var TPay = pData[0].value
        }
        var finalPay = parseFloat(toWith) + parseFloat(TPay)
        db.collection('admin').updateOne({Payout:'Payout'},{$set:{value:finalPay}})
    }catch(e){
        console.error(e);
    }
})




//Minimum Withdraw Scene
mini.on('text', async (ctx) =>{
    try{
        const name = 'mini'
        let admin = await db.collection('admin').find({admin:'admin'}).toArray()
        let tax = admin[0].tax
        if (ctx.message.text == '🔙 Back') {
            starter(ctx)
        } else if (isNaN(ctx.message.text)){
            ctx.replyWithMarkdown(
                '*⛔ Enter A Valid Amount*', { reply_markup: { keyboard:mainkey, resize_keyboard: true } }
            )
        
        }else{
            let finalamo = (parseFloat(ctx.message.text)/100) * tax
            let amo =  parseFloat(parseFloat(ctx.message.text) - finalamo)
            if(amo < 1){
                ctx.replyWithMarkdown(
                    '*⛔ Please Increase Minimum Withdraw Or Decrease Tax*', { reply_markup: { keyboard:mainkey, resize_keyboard: true } }
                )
                
            }else{
                db.collection('admin').updateOne({admin:'admin'},{$set:{mini: parseFloat(ctx.message.text)}})
            ctx.replyWithMarkdown(
                '*✅ Minimum Withdraw Updated To '+ctx.message.text+'*', { reply_markup: { keyboard: mainkey, resize_keyboard: true } }
            )
            }
        }
        ctx.scene.leave(name)
    }catch(e){
        senderr(e)
    }
})

//Maximum Withraw Scene
max.on('text', async (ctx) =>{
    try{
        const name = 'max'
        if (ctx.message.text == '🔙 Back') {
            starter(ctx)
        } else if (isNaN(ctx.message.text)){
            ctx.replyWithMarkdown(
                '*⛔ Enter A Valid Amount*', { reply_markup: { keyboard:mainkey, resize_keyboard: true } }
            )
        }else{
            db.collection('admin').updateOne({admin:'admin'},{$set:{max: parseFloat(ctx.message.text)}})
            ctx.replyWithMarkdown(
                '*✅ Maximum Withdraw Updated To '+ctx.message.text+'*', { reply_markup: { keyboard: mainkey, resize_keyboard: true } }
            )
        }
        ctx.scene.leave(name)
    }catch(e){
        senderr(e)
    }
})

//Refer Bonus Scene
getref.on('text', async (ctx) =>{
    try{
        const name = 'getref'
        if (ctx.message.text == '🔙 Back') {
            starter(ctx)
        } else if (isNaN(ctx.message.text)){
            ctx.replyWithMarkdown(
                '*⛔ Enter A Valid Amount*', { reply_markup: { keyboard:mainkey, resize_keyboard: true } }
            )
        }else{
            db.collection('admin').updateOne({admin:'admin'},{$set:{ref: parseFloat(ctx.message.text)}})
            ctx.replyWithMarkdown(
                '*✅ Refer Bonus Updated To '+ctx.message.text+'*', { reply_markup: { keyboard: mainkey, resize_keyboard: true } }
            )
        }
        ctx.scene.leave(name)
    }catch(e){
        senderr(e)
    }
})


//Tax Withdraw Scene
tax.on('text', async (ctx) =>{
    try{
        const name = 'tax'
        let admin = await db.collection('admin').find({admin:'admin'}).toArray()
        const mini = admin[0].mini
        const tax = parseFloat(ctx.message.text)
        let finalamo = (mini/100) * tax
        let amo =  parseFloat(mini - finalamo)
        if (ctx.message.text == '🔙 Back') {
            starter(ctx)
        } else if (isNaN(ctx.message.text)){
            ctx.replyWithMarkdown(
                '*⛔ Enter A Valid Amount*', { reply_markup: { keyboard:mainkey, resize_keyboard: true } }
            )
        }else if(amo < 1){
            ctx.replyWithMarkdown(
                '*⛔ ⛔ Please Increase Minimum Withdraw Or Decrease Tax*', { reply_markup: { keyboard:mainkey, resize_keyboard: true } }
            )
        }else{
            db.collection('admin').updateOne({admin:'admin'},{$set:{tax: ctx.message.text}})
            ctx.replyWithMarkdown(
                '*✅ Withdraw Tax Updated To '+ctx.message.text+'%*', { reply_markup: { keyboard: mainkey, resize_keyboard: true } }
            )
        }
        ctx.scene.leave(name)
    }catch(e){
        senderr(e)
    }
})

//Payment Channel Scene
paycha.on('text',async (ctx) =>{
    try{
        const name = 'paycha'
        if (ctx.message.text == '🔙 Back') {
            starter(ctx)
        }else if(ctx.message.text.split('')[0] != '@'){
            ctx.replyWithMarkdown("*⛔ Channel Username Must Start With @*",{reply_markup:{keyboard:mainkey,resize_keyboard:true}})
        }else{
            db.collection('admin').updateOne({admin:'admin'},{$set:{paycha:ctx.message.text}})
            ctx.replyWithMarkdown("*✅ Payment Channel Updated To "+ctx.message.text+"*",{reply_markup:{keyboard:mainkey,resize_keyboard:true}})
        }
        await ctx.scene.leave(name)
    }catch(e){
        senderr(e)
    }
})

// Add Channel Scene
addcha.on('text', async (ctx) => {
    try {
        const name = 'addcha'
        const text = ctx.message.text;
        if (typeof text !== 'string') {
            ctx.replyWithMarkdown("*⛔ Invalid input.*", { reply_markup: { keyboard: mainkey, resize_keyboard: true } })
        } else if (text == '🔙 Back') {
            starter(ctx)
        } else if (text[0] != '@') {
            ctx.replyWithMarkdown("*⛔ Channel Username Must Start With @*", { reply_markup: { keyboard: mainkey, resize_keyboard: true } })
        } else {
            let admin = await db.collection('admin').find({ admin: 'admin' }).toArray()
            let oldCha = admin[0].channels
            if (oldCha.includes(text)) {
                ctx.replyWithMarkdown("*⛔ This channel is already in our database.*", { reply_markup: { keyboard: mainkey, resize_keyboard: true } })
            } else {
                oldCha.push(text)
                db.collection('admin').updateOne({ admin: 'admin' }, { $set: { channels: oldCha } })
                ctx.replyWithMarkdown("*✅ " + text + " Added To Our Database*", { reply_markup: { keyboard: mainkey, resize_keyboard: true } })
            }
        }
        await ctx.scene.leave(name)
    } catch (e) {
        senderr(e)
    }
})

// Remove Channel Scene
rcha.on('text', async (ctx) => {
    try {
        const name = 'rcha'
        const text = ctx.message.text;
        if (typeof text !== 'string') {
            ctx.replyWithMarkdown("*⛔ Invalid input.*", { reply_markup: { keyboard: mainkey, resize_keyboard: true } })
        } else if (text == '🔙 Back') {
            starter(ctx)
        } else if (text[0] != '@') {
            ctx.replyWithMarkdown("*⛔ Channel Username Must Start With @*", { reply_markup: { keyboard: mainkey, resize_keyboard: true } })
        } else {
            let admin = await db.collection('admin').find({ admin: 'admin' }).toArray()
            let oldCha = admin[0].channels
            if (!oldCha.includes(text)) {
                ctx.replyWithMarkdown("*⛔ Channel Not Found In Database*", { reply_markup: { keyboard: mainkey, resize_keyboard: true } })
            } else {
                let newCha = oldCha.filter(channel => channel !== text);
                db.collection('admin').updateOne({ admin: 'admin' }, { $set: { channels: newCha } })
                ctx.replyWithMarkdown("*✅ " + text + " Removed From Our Database*", { reply_markup: { keyboard: mainkey, resize_keyboard: true } })
            }
        }
        await ctx.scene.leave(name)
    } catch (e) {
        senderr(e)
    }
})
//Change Balance Scene
chabal.on('text',async (ctx)=>{
    try{
        const name = 'chabal'
        const msg = ctx.message.text
        var id = msg.split(' ')[0]
        var amo2 = msg.split(' ')[1]
        if (msg == '🔙 Back') {
            starter(ctx)
        }else if(id == undefined || amo2 == undefined){
            ctx.replyWithMarkdown("*⚠️Please Provide Telegram Id Or Amount*",{reply_markup:{keyboard:mainkey,resize_keyboard:true}})
        }else if(isNaN(id) || isNaN(amo2)){
            ctx.replyWithMarkdown("*🚫 Not Valid Amount Or Telegram id*",{reply_markup:{keyboard:mainkey,resize_keyboard:true}})
        }else{
            var amo = parseFloat(amo2);
            var id2 = parseInt(id)
            let data = await db.collection('info').find({user:id2}).toArray()
            if(!(data.length)){
                ctx.replyWithMarkdown("*⛔User Not Found In Our Database*",{reply_markup:{keyboard:mainkey,resize_keyboard:true}})
            }else{
                if(!('balance' in data[0])){
                    var bal = 0;
                }else{
                    var bal = data[0].balance
                }
                var final = parseFloat(bal) + amo
                db.collection('info').updateOne({user:id2},{$set:{'balance':final}})
                bot.telegram.sendMessage(id2,"*💰 Admin Changed Your Balance To "+final.toFixed(3)+" "+curr+"*",{parse_mode:"Markdown"})
                ctx.replyWithMarkdown("*✅ Balance Updated Final Balance: "+final+" "+curr+"*",{reply_markup:{keyboard:mainkey,resize_keyboard:true}})
            }
        }
        ctx.scene.leave(name)
    }catch(e){
        senderr(e)
    }
})

//User Details Scene
getdetails.on('text',async (ctx) =>{
    try{
        const name = 'getdetails'
        const msg = ctx.message.text
        if (msg == '🔙 Back') {
            starter(ctx)
        }else{
            let data = await db.collection('info').find({user:parseInt(ctx.message.text)}).toArray()
            if(!(data.length)){
                ctx.replyWithMarkdown("*⛔User Not Found In Our Database*",{reply_markup:{keyboard:mainkey,resize_keyboard:true}})
            }else{
                if(!('balance' in data[0])){
                    var bal = 0;
                }else{
                    var bal = data[0].balance
                }
                if(!('wallet' in data[0])){
                    var wallet = 'NOT SET'
                }else{
                    var wallet = data[0].wallet;
                }
                let rData = await db.collection('refer').find({user:parseInt(ctx.message.text)}).toArray()
                var invited = rData[0].invited
                var text = "*🐥 User: *["+ctx.message.text+"](tg://user?id="+ctx.message.text+")\n\n*💰 Balance: "+bal.toFixed(3)+" "+curr+"\n🗂️ Paytm Number: *`"+wallet+"`\n*👫 Invited By: *`"+invited+"`"
                ctx.replyWithMarkdown(text,{reply_markup:{keyboard:mainkey,resize_keyboard:true}})
            }
        }
        ctx.scene.leave(name)
    }catch(e){
        senderr(e)
    }
})

bot.command('panel',async (ctx) =>{
    try{
        if(!(admins.includes(ctx.from.id))){
            return
        }
        let admin = await db.collection('admin').find({admin:'admin'}).toArray()
        let ref = admin[0].ref
        let mini = admin[0].mini
        let max = admin[0].max
        let tax = admin[0].tax
        var data = admin;
        let botstat = admin[0].botstat
        let withstat = admin[0].withstat
        if (botstat = 'Active'){
            var bot_button = "✅ Active"
        }else{
            var bot_button = "⛔️ Disable"
        }
        if(withstat = 'On'){
            var with_button = "✅ On"
        }else{
            var with_button = "⛔️ Off"
        }
        var inline = [
            [{text:'💰 Refer',callback_data:'change_ref'},{text:'💰 Minimum',callback_data:'change_mini'}],
            [{text:'🚨 Change Tax',callback_data:'change_tax'},{text:'💰 Maximum',callback_data:'change_max'}],
            [{text:'🌲Change Channels',callback_data:'change_cha'}],
            [{text:'🛑Change Balance',callback_data:'change_balance'},{text:'🧾Get Details',callback_data:'get_details'}],
            [{text:'🟢Bot:'+bot_button+'',callback_data:'bot_status'},{text:'🟢Withdraw:'+with_button+'',callback_data:'with_status'}]
        ]
        let text = "*👋 Hey "+ctx.from.first_name+"\n🤘🏻Welcome To Admin Panel\n\n💡 Bot Current Stats:\n\t\t\t\t💰 Per Refer: "+ref.toFixed(3)+" "+curr+"\n\t\t\t\t💰 Minimum Withdraw: "+mini.toFixed(3)+" "+curr+"\n\t\t\t\t💰 Maximum Withdraw: "+max.toFixed(3)+" "+curr+"\n\t\t\t\t🚨 Tax: %"+tax+"\n\t\t\t\t🤖 Bot Status:"+bot_button+"\n\t\t\t\t📤 Withdrawals:"+with_button+"*"
        ctx.replyWithMarkdown(text,{reply_markup:{inline_keyboard:inline}})
    }catch(e){
        senderr(e)
    }
})

bot.action('change_ref',(ctx) =>{
    try{
        ctx.deleteMessage()
        ctx.replyWithMarkdown("*💡 Enter New Refer Bonus Amount*",{reply_markup:{keyboard:[['🔙 Back']],resize_keyboard:true}})
        ctx.scene.enter('getref')
    }catch(e){
        senderr(e)
    }
})

bot.action('change_mini',(ctx) =>{
    try{
        ctx.deleteMessage()
        ctx.replyWithMarkdown("*💡 Enter New Minimum Withdraw Amount*",{reply_markup:{keyboard:[['🔙 Back']],resize_keyboard:true}})
        ctx.scene.enter('mini')
    }catch(e){
        senderr(e)
    }
})

bot.action('change_max',(ctx) =>{
    try{
        ctx.deleteMessage()
        ctx.replyWithMarkdown("*💡 Enter New Maximum Withdraw Amount*",{reply_markup:{keyboard:[['🔙 Back']],resize_keyboard:true}})
        ctx.scene.enter('max')
    }catch(e){
        senderr(e)
    }
})

bot.action('change_tax',(ctx) =>{
    try{
        ctx.deleteMessage()
        ctx.replyWithMarkdown("*💡 Enter Withdraw Tax Amount Without %*",{reply_markup:{keyboard:[['🔙 Back']],resize_keyboard:true}})
        ctx.scene.enter('tax')
    }catch(e){
        senderr(e)
    }
})

bot.action('change_balance',(ctx) =>{
    try{
        ctx.deleteMessage()
        ctx.replyWithMarkdown('*💡 Send User Telegram Id & Amount\n\n⚠️ Use Format : *`' + ctx.from.id + ' 10`',{reply_markup:{keyboard:[['🔙 Back']],resize_keyboard:true}})
        ctx.scene.enter('chabal')
    }catch(e){
        senderr(e)
    }
})

bot.action('get_details',(ctx) =>{
    try{
        ctx.deleteMessage()
        ctx.replyWithMarkdown("*💡 Send User Telegram Id *",{reply_markup:{keyboard:[['🔙 Back']],resize_keyboard:true}})
        ctx.scene.enter('getdetails')
    }catch(e){
        senderr(e)
    }
})

bot.action('bot_status', async (ctx) =>{
    try{
        let admin = await db.collection('admin').find({admin:'admin'}).toArray()
        if(admin[0].botstat == 'Active'){
            db.collection('admin').updateOne({admin:'admin'},{$set:{botstat:'Disable'}})
            var bot_button = "⛔️ Disable"
        }else{
            var bot_button = "✅ Active"
            db.collection('admin').updateOne({admin:'admin'},{$set:{botstat:'Active'}})
        }
        let ref = admin[0].ref
        let mini = admin[0].mini
        let max = admin[0].max
        let tax = admin[0].tax
        let withstat = admin[0].withstat
        if(withstat = 'On'){
            var with_button = "✅ On"
        }else{
            var with_button = "⛔️ Off"
        }
        var inline = [
            [{text:'💰 Refer',callback_data:'change_ref'},{text:'💰 Minimum',callback_data:'change_mini'}],
            [{text:'🚨 Change Tax',callback_data:'change_tax'},{text:'💰 Maximum',callback_data:'change_max'}],
            [{text:'🌲Change Channels',callback_data:'change_cha'}],
            [{text:'🛑Change Balance',callback_data:'change_balance'},{text:'🧾Get Details',callback_data:'get_details'}],
            [{text:'🟢Bot:'+bot_button+'',callback_data:'bot_status'},{text:'🟢Withdraw:'+with_button+'',callback_data:'with_status'}]
        ]
        let text = "*👋 Hey "+ctx.from.first_name+"\n🤘🏻Welcome To Admin Panel\n\n💡 Bot Current Stats:\n\t\t\t\t💰 Per Refer: "+ref.toFixed(3)+" "+curr+"\n\t\t\t\t💰 Minimum Withdraw: "+mini.toFixed(3)+" "+curr+"\n\t\t\t\t💰 Maximum Withdraw: "+max.toFixed(3)+" "+curr+"\n\t\t\t\t🚨 Tax: %"+tax+"\n\t\t\t\t🤖 Bot Status:"+bot_button+"\n\t\t\t\t📤 Withdrawals:"+with_button+"*"
        ctx.editMessageText(text,{reply_markup:{inline_keyboard:inline},parse_mode:'Markdown'})
    }catch(e){
        senderr(e)
    }
})

bot.action('with_status', async (ctx) =>{
    try{
        let admin = await db.collection('admin').find({admin:'admin'}).toArray()
        let botstat = admin[0].botstat
        let withstat = admin[0].withstat
        if(withstat == 'On'){
            db.collection('admin').updateOne({admin:'admin'},{$set:{withstat:'Off'}})
            var with_button = "⛔️ Off"
        }else{
            var with_button = "✅ On"
            db.collection('admin').updateOne({admin:'admin'},{$set:{withstat:'On'}})
        }
        let ref = admin[0].ref
        let mini = admin[0].mini
        let max = admin[0].max
        let tax = admin[0].tax        
        if (botstat = 'Active'){
            var bot_button = "✅ Active"
        }else{
            var bot_button = "⛔️ Disable"
        }
        var inline = [
            [{text:'💰 Refer',callback_data:'change_ref'},{text:'💰 Minimum',callback_data:'change_mini'}],
            [{text:'🚨 Change Tax',callback_data:'change_tax'},{text:'💰 Maximum',callback_data:'change_max'}],
            [{text:'🌲Change Channels',callback_data:'change_cha'}],
            [{text:'🛑Change Balance',callback_data:'change_balance'},{text:'🧾Get Details',callback_data:'get_details'}],
            [{text:'🟢Bot:'+bot_button+'',callback_data:'bot_status'},{text:'🟢Withdraw:'+with_button+'',callback_data:'with_status'}]
        ]
        let text = "*👋 Hey "+ctx.from.first_name+"\n🤘🏻Welcome To Admin Panel\n\n💡 Bot Current Stats:\n\t\t\t\t💰 Per Refer: "+ref.toFixed(3)+" "+curr+"\n\t\t\t\t💰 Minimum Withdraw: "+mini.toFixed(3)+" "+curr+"\n\t\t\t\t💰 Maximum Withdraw: "+max.toFixed(3)+" "+curr+"\n\t\t\t\t🚨 Tax: %"+tax+"\n\t\t\t\t🤖 Bot Status:"+bot_button+"\n\t\t\t\t📤 Withdrawals:"+with_button+"*"
        ctx.editMessageText(text,{reply_markup:{inline_keyboard:inline},parse_mode:'Markdown'})
    }catch(e){
        senderr(e)
    }
})

bot.action('change_cha',async (ctx) =>{
    try{
        let admin = await db.collection('admin').find({admin:'admin'}).toArray()
        let channel = admin[0].channels
        let text = "*🌲 Currenly Set Channels:\n"
        if (!(channel.length)){
            text += "⛔️ No Any Channels Added"
        }
        for (i in channel){
            let cha = channel[i]
            text += "\t\t\t\t"+cha+"\n"
        }
        text += "\n\n➡️ Payout Channel: "+admin[0].paycha+"*"
        var inline = [
            [{text:'➕ Add Channel',callback_data:"add_cha"},{text:'➖ Remove Channel',callback_data:'r_cha'}],
            [{text:'📤 Payout Channel',callback_data:'pay_cha'}]
        ]
        ctx.editMessageText(text,{reply_markup:{inline_keyboard:inline},parse_mode:'Markdown'})
    }catch(e){
        senderr(e)
    }
})

bot.action('add_cha',(ctx) =>{
    try{
        ctx.deleteMessage()
        ctx.replyWithMarkdown('*💡 Send Username Of Channel*',{reply_markup:{keyboard:[['🔙 Back']],resize_keyboard:true}})
        ctx.scene.enter('addcha')
    }catch(e){
        senderr(e)
    }
})

bot.action('r_cha',(ctx) =>{
    try{
        ctx.deleteMessage()
        ctx.replyWithMarkdown('*💡 Send Username Of Channel*',{reply_markup:{keyboard:[['🔙 Back']],resize_keyboard:true}})
        ctx.scene.enter('rcha')
    }catch(e){
        senderr(e)
    }
})

bot.action('pay_cha',(ctx) =>{
    try{
        ctx.deleteMessage()
        ctx.replyWithMarkdown('*💡 Send Username Of Channel*',{reply_markup:{keyboard:[['🔙 Back']],resize_keyboard:true}})
        ctx.scene.enter('paycha')
    }catch(e){
        senderr(e)
    }
})

broad.on('text',async (ctx) =>{
    let uData = await db.collection('info').find({},{projection:{user:1,'_id':0}}).toArray()
    let msg = ctx.message.text
    if (msg == '🔙 Back') {
            starter(ctx)
            ctx.scene.leave('broad')
            return
     }
    ctx.replyWithMarkdown("*✅ Broadcast Sended To All Users*",{reply_markup:{keyboard:mainkey,resize_keyboard:true}})
    for (var i of uData){
       bot.telegram.sendMessage(i.user,"*🔈 Broadcast By Admin*\n\n"+msg+"",{parse_mode:"Markdown",disable_web_page_preview:true}).catch(e => console.log(e))
    }
    ctx.scene.leave('broad')

})

bot.command('broadcast',async (ctx) =>{
    if(!(admins.includes(ctx.from.id))){
        return
    }
    ctx.reply(
        '*💡 Send Message To Send Broadcast*', { parse_mode: 'markdown', reply_markup: { keyboard: [['🔙 Back']], resize_keyboard: true } }
    )
    await ctx.scene.enter('broad')
})

async function starter(ctx){
    var text = "*👋 Welcome To Main Menu*"
    ctx.replyWithMarkdown(text,{reply_markup:{keyboard:mainkey, resize_keyboard: true }})
}

async function sendJoined(ctx, data) {
    try {
        let channels = data[0].channels
        let text = "*⚠️ Must Join Our All Channels*\n\n✅ After Joining Click On '🟢 Joined'"

        let inlineKeyboard = channels.map((channel, index) => {
            return [{ text: `Channel ${index + 1}`, url: channel }]
        });

        inlineKeyboard.push([{ text: '🟢 Joined', callback_data: 'joined' }]);

        ctx.replyWithMarkdown(text, { reply_markup: { inline_keyboard: inlineKeyboard } })
    } catch (e) {
        console.log(e)
        senderr(e)
    }
}

async function joinCheck(userId, data) {
    try {
        let isUserJoined = true;
        let channels = data[0].channels;
        for (let i in channels) {
            let currentChannel = channels[i];
            let chatMember = await bot.telegram.getChatMember(currentChannel, userId);
            let memberStatus = chatMember.status;
            if (memberStatus == 'creator' || memberStatus == 'administrator' || memberStatus == 'member') {
                continue;
            } else {
                isUserJoined = false;
                break;
            }
        }
        return isUserJoined;
    } catch (e) {
        console.log(e);
        senderr(e);
        return false;
    }
}

function contains(obj, list) {
    var i;
    for (i = 0; i < list.length; i++) {
        if (list[i] === obj) {
            return true;
       }
   }
   return false;
}

function arrayRemove(arr, value) {
    return arr.filter(function (ele) {
        return ele != value;
    });
}

bot.command('sendto', async (ctx) => {
    // Check if the sender is an admin
    if (admins.includes(ctx.from.id)) {
        // Split the message text by spaces
        let parts = ctx.message.text.split(' ');

        // Check if the command has the correct number of parts
        if (parts.length < 3) {
            ctx.reply('Usage: /sendto USER_ID Your custom message goes here');
            return;
        }

        // The second part should be the user ID
        let userId = parts[1];

        // The rest of the parts make up the message
        let message = parts.slice(2).join(' ');

        // Check if the user ID and message are valid
        if (!userId || !message) {
            ctx.reply('Error: User ID or message is missing');
            return;
        }

        // Send the message to the specified user
        ctx.telegram.sendMessage(userId, message);
    } else {
        ctx.reply('Sorry, you must be an admin to use this command.');
    }
});