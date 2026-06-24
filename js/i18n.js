/**
 * 3D Robotic Arm Simulation — Internationalization (i18n)
 * Complete Thai/English dictionary covering all UI elements
 * Origin: V1 i18n system, extended for V5 UI
 */
(function () {
    'use strict';

    window.RobotSim = window.RobotSim || {};

    window.RobotSim.I18N = {
        /* ==================== ภาษาไทย ==================== */
        th: {
            // Header
            title: "Robotic Arm Simulation",
            subtitle: "เรียนรู้อัลกอริทึมแขนกล พร้อมระบบพิกัด X, Y",
            badge: "ระบบจัดการโจทย์ 10 ข้อ",
            creatorName: "สร้างโดย พีลพัทร์ แก้วคง",
            speedSlow: "ช้า",
            speedFast: "เร็ว",
            adminBtn: "โหมดครู (Admin)",
            adminLogout: "ออกจากระบบครู",
            langToggle: "EN",

            // Challenge Panel
            challengesTitle: "ภารกิจ (Challenges)",
            loadingChallenges: "กำลังโหลดโจทย์...",

            // Algorithm Panel
            controlTitle: "ควบคุมแขนกล",
            tabAlgo: "เขียนโปรแกรม",
            tabManual: "ปรับเอง (Manual)",
            sliderBase: "หมุนฐาน (Base)",
            sliderShoulder: "หมุนไหล่ (Shoulder)",
            sliderElbow: "หมุนศอก (Elbow)",
            sliderWrist: "หมุนข้อมือ (Wrist)",
            algoTitle: "สร้างอัลกอริทึม",
            blocksUnit: "บล็อก",
            actionBase: "1. หมุนฐาน (Base)",
            actionShoulder: "2. หมุนไหล่ (Shoulder)",
            actionElbow: "3. หมุนศอก (Elbow)",
            actionWrist: "4. หมุนข้อมือ (Wrist)",
            actionGripperClose: "5. ปิดมือจับ (หยิบวัตถุ)",
            actionGripperOpen: "6. เปิดมือจับ (ปล่อยวัตถุ)",
            degreePlaceholder: "องศา",
            addBlock: "เพิ่มคำสั่งลงในอัลกอริทึม",
            noBlocks: "ยังไม่มีคำสั่ง (เพิ่มคำสั่งด้านบน)",
            gripperToggle: "สลับมือจับ (Gripper)",
            aiTutor: "✨ ให้ AI ช่วยแนะนำ (Gemini Tutor)",
            runAlgo: "ทดสอบการทำงาน",
            runningLabel: "กำลังทำงาน...",
            clearAlgo: "ล้างคำสั่งทั้งหมด",
            resetPos: "รีเซ็ตตำแหน่ง",

            // Block descriptions
            blockBase: "หมุนฐาน ไปที่",
            blockShoulder: "หมุนไหล่ ไปที่",
            blockElbow: "หมุนศอก ไปที่",
            blockWrist: "หมุนข้อมือ ไปที่",
            blockGripperClose: "ปิดมือจับ (หนีบวัตถุ)",
            blockGripperOpen: "เปิดมือจับ (ปล่อยวัตถุ)",

            // Status Messages
            statusReady: "รอรับคำสั่ง...",
            statusGrabbed: "จับวัตถุสำเร็จ!",
            statusMissed: "วืด! อยู่นอกระยะ",
            statusDropped: "ปล่อยวัตถุแล้ว",
            statusRunning: "กำลังทำงาน: คำสั่งที่",
            statusComplete: "อัลกอริทึมทำงานเสร็จสิ้น",
            statusFailed: "ยังไม่สำเร็จเป้าหมาย ลองปรับแก้อัลกอริทึมใหม่",
            statusMission: "ผ่านภารกิจ!",
            statusReset: "พร้อมรับคำสั่ง...",
            currentChallenge: "โจทย์ปัจจุบัน:",

            // Auth Modal
            authTitle: "เข้าสู่ระบบโหมดครู",
            authLogin: "เข้าสู่ระบบ",
            authCancel: "ยกเลิก",
            authError: "เข้าสู่ระบบล้มเหลว ตรวจสอบ Email/Password",

            // Challenge Modal
            challengeModalTitle: "จัดการโจทย์",
            aiGenChallenge: "✨ ใช้ AI สุ่มโจทย์",
            challengeName: "ชื่อโจทย์",
            challengeNamePlaceholder: "เช่น หยิบวัตถุตำแหน่ง (3, 2)",
            challengeX: "พิกัดแกน X (ซ้าย-ขวา)",
            challengeY: "พิกัดแกน Y (หน้า-หลัง)",
            saveChallenge: "บันทึกโจทย์",
            firebaseSaveError: "เกิดข้อผิดพลาดในการบันทึก กรุณาตรวจสอบ Firebase Rules",

            // AI Modal
            aiAnalyzing: "วิเคราะห์อัลกอริทึม...",
            aiError: "ขออภัย การเชื่อมต่อ AI มีปัญหาชั่วคราว",
            aiClose: "ปิดหน้าต่าง",
            aiThinking: "กำลังคิด...",

            // Success Modal
            successTitle: "ภารกิจสำเร็จ!",
            successDesc: "อัลกอริทึมของคุณหยิบวัตถุเป้าหมายได้สำเร็จ",
            successEfficiency: "ประสิทธิภาพโค้ด (ใช้",
            successUnit: "คำสั่ง)",
            successBtn: "ยอดเยี่ยม!",
            star3: "สมบูรณ์แบบ! โค้ดสั้นและมีประสิทธิภาพสูงสุด",
            star2: "ทำได้ดี! ลองปรับลดคำสั่งลงอีกนิดเพื่อความเร็ว",
            star1: "ผ่านเกณฑ์พื้นฐาน",

            // Tooltip
            tooltipFloor: "พิกัดพื้น:",
            tooltipTarget: "วัตถุสีแดง:",
            tooltipRobot: "หุ่นยนต์แขนกล",

            // API Key Modal
            apiKeyTitle: "ตั้งค่า Gemini API Key",
            apiKeyPlaceholder: "วาง API Key ที่นี่...",
            apiKeySave: "บันทึก",
            apiKeyInfo: "รับ API Key ได้ที่ Google AI Studio",
            apiKeySaved: "บันทึก API Key แล้ว!",
            selectChallengeFirst: "กรุณาเลือกโจทย์ก่อน"
        },

        /* ==================== English ==================== */
        en: {
            // Header
            title: "Robotic Arm Simulation",
            subtitle: "Learn robotic arm algorithms with X, Y coordinates",
            badge: "10 Challenge System",
            creatorName: "Created by Peelaphat Kaewkong",
            speedSlow: "Slow",
            speedFast: "Fast",
            adminBtn: "Teacher (Admin)",
            adminLogout: "Sign Out",
            langToggle: "TH",

            // Challenge Panel
            challengesTitle: "Challenges",
            loadingChallenges: "Loading challenges...",

            // Algorithm Panel
            controlTitle: "Robot Control",
            tabAlgo: "Algorithm",
            tabManual: "Manual",
            sliderBase: "Base",
            sliderShoulder: "Shoulder",
            sliderElbow: "Elbow",
            sliderWrist: "Wrist",
            algoTitle: "Build Algorithm",
            blocksUnit: "blocks",
            actionBase: "1. Rotate Base",
            actionShoulder: "2. Rotate Shoulder",
            actionElbow: "3. Rotate Elbow",
            actionWrist: "4. Rotate Wrist",
            actionGripperClose: "5. Close Gripper (Grab)",
            actionGripperOpen: "6. Open Gripper (Release)",
            degreePlaceholder: "Degree",
            addBlock: "Add Command",
            noBlocks: "No commands yet (add above)",
            gripperToggle: "Toggle Gripper",
            aiTutor: "✨ AI Assist (Gemini Tutor)",
            runAlgo: "Test Algorithm",
            runningLabel: "Running...",
            clearAlgo: "Clear All",
            resetPos: "Reset Position",

            // Block descriptions
            blockBase: "Rotate base to",
            blockShoulder: "Rotate shoulder to",
            blockElbow: "Rotate elbow to",
            blockWrist: "Rotate wrist to",
            blockGripperClose: "Close gripper (grab)",
            blockGripperOpen: "Open gripper (release)",

            // Status Messages
            statusReady: "Ready...",
            statusGrabbed: "Object grabbed!",
            statusMissed: "Missed! Out of range",
            statusDropped: "Object released",
            statusRunning: "Running: command",
            statusComplete: "Algorithm completed",
            statusFailed: "Objective not met. Try adjusting your algorithm",
            statusMission: "Mission complete!",
            statusReset: "Ready...",
            currentChallenge: "Current challenge:",

            // Auth Modal
            authTitle: "Teacher Login",
            authLogin: "Sign In",
            authCancel: "Cancel",
            authError: "Login failed. Check Email/Password",

            // Challenge Modal
            challengeModalTitle: "Manage Challenge",
            aiGenChallenge: "✨ AI Generate",
            challengeName: "Challenge Name",
            challengeNamePlaceholder: "e.g. Pick object at (3, 2)",
            challengeX: "X Coordinate (Left-Right)",
            challengeY: "Y Coordinate (Front-Back)",
            saveChallenge: "Save",
            firebaseSaveError: "Save error. Check Firebase rules.",

            // AI Modal
            aiAnalyzing: "Analyzing algorithm...",
            aiError: "Sorry, AI connection temporarily unavailable",
            aiClose: "Close",
            aiThinking: "Thinking...",

            // Success Modal
            successTitle: "Mission Complete!",
            successDesc: "Your algorithm successfully grabbed the target",
            successEfficiency: "Code efficiency (used",
            successUnit: "commands)",
            successBtn: "Excellent!",
            star3: "Perfect! Short and highly efficient code",
            star2: "Good job! Try reducing commands",
            star1: "Basic pass",

            // Tooltip
            tooltipFloor: "Floor:",
            tooltipTarget: "Red object:",
            tooltipRobot: "Robotic Arm",

            // API Key Modal
            apiKeyTitle: "Set Gemini API Key",
            apiKeyPlaceholder: "Paste API Key here...",
            apiKeySave: "Save",
            apiKeyInfo: "Get API Key from Google AI Studio",
            apiKeySaved: "API Key saved!",
            selectChallengeFirst: "Please select a challenge first"
        }
    };
})();
