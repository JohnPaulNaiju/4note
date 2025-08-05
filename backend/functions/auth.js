const path = require('path');
const fs = require('fs').promises;
const { auth, db } = require('./config');
const nodemailer = require('nodemailer');
const validator = require('email-validator');
const otpGenerator = require('otp-generator');
const { logger } = require('firebase-functions');
const { FieldValue } = require('firebase-admin/firestore');

const pass = "vjwn dfqr jkfn phun";
const from = 'johnpaul100574@gmail.com';
const OTP_EXPIRY_TIME = 300000;

const genKey = () => {
    let pass = '';
    let str = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789~!@#$%^&*()_+[]{}|;:,./<>?';
    for (let i = 1; i <= 100; i++) {
        let char = Math.floor(Math.random()* str.length + 1);
        pass += str.charAt(char)
    }
    return pass;
};

const validate = (email) => {
    const isValid = validator.validate(email);
    return isValid;
};

const genOTP = () => {
    const OTP = otpGenerator.generate(6, { digits: true, lowerCaseAlphabets: false, upperCaseAlphabets: false, specialChars: false });
    return OTP;
};

const readNReplace = async(otp) => {
    const filePath = path.resolve(__dirname, "./", "assets","otp.html");
    let data = await fs.readFile(filePath, "utf-8");
    data = data.replace(/__OTP__/g, otp);
    return data;
};

const sendEmail = async(to, html) => {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: from,
            pass: pass,
        }
    });
    var mailOptions = {
        from: `4note Labs team`,
        to: to,
        subject: 'OTP for your 4note account authentication',
        html: html,
    };
    await transporter.sendMail(mailOptions);
    return true;
};

const saveOTP = async(otp, email) => {
    await db.collection('otp').doc(email).set({
        email: email,
        otp: otp,
        createdAt: Date.now(),
    });
    return true;
};

const delOTP = async(email) => {
    try{
        await db.collection('otp').doc(email).delete();
        return true;
    }catch{
        return false;
    }
};

const checkOTP = async(otp, email) => {
    const doc = await db.collection('otp').doc(email).get();
    if(!doc.exists) return { success: false, message: "No OTP data found for this email" };
    const data = doc.data();
    const realOTP = data.otp;
    const createdAt = data.createdAt;
    const currentTime = Date.now();
    const elapsedTime = currentTime - createdAt;
    if (elapsedTime > OTP_EXPIRY_TIME) return { success: false, message: "OTP expired" };
    else if(otp!==realOTP) return { success: false, message: "Wrong OTP" };
    else return { success: true, message: "OTP verification was successful" };
};

const createUserDatabase = async(userData) => {
    try{

        const data1 = {
            uid: userData.uid, 
            email: userData.email, 
            displayName: userData.displayName || null, 
            photoURL: userData.photoURL || null, 
            phoneNumber: userData.phoneNumber || null, 
            createdAt: FieldValue.serverTimestamp(), 
        };

        const data2 = {
            storage_used: 0, 
            storage_available: 1000000000, //1 GB in bytes
            accountType: 'free', 
        };

        await db.collection('users').doc(userData.uid).set(data1);
        await db.collection('subscription').doc(userData.uid).set(data2);

        return true;

    }catch(e){
        logger.error(`Error in auth.js at createUserDatabase: ${e}`);
        return false;
    }

};

const continueForAuth = async(email) => {
    const userExists = await auth.getUserByEmail(email).then((user) => user.uid).catch(() => false);
    const newPass = genKey();
    if(userExists){
        await auth.updateUser(userExists, {
            password: newPass
        });
    }else{
        const user = await auth.createUser({
            email: email,
            password: newPass,
        });
        createUserDatabase(user);
    }
    return newPass;
};

module.exports = { validate, genOTP, readNReplace, sendEmail, saveOTP, delOTP, checkOTP, continueForAuth };