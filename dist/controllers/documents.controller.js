"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateDeathReport = exports.generateMarriageCertificate = exports.generateIndividualRecord = exports.generateFamilyRecord = void 0;
const prisma_1 = __importDefault(require("../utils/prisma"));
const pdfGenerator_1 = require("../utils/pdfGenerator");
const qrcode_1 = __importDefault(require("qrcode"));
const EMBLEM_URL = 'http://localhost:5000/images/syria-emblem-2025.png';
const normalizeText = (value) => value?.toString().replace(/\s+/g, ' ').trim() || '';
const formatCell = (value) => normalizeText(value) || '—';
const formatName = (name, nisba) => `${normalizeText(name)}${nisba ? ' ' + normalizeText(nisba) : ''}`.trim();
const formatDate = (value) => (value ? value.toISOString().split('T')[0] : '—');
const sortByOldest = (a, b) => {
    const firstDate = a?.dateOfBirth ? new Date(a.dateOfBirth).getTime() : Number.MAX_SAFE_INTEGER;
    const secondDate = b?.dateOfBirth ? new Date(b.dateOfBirth).getTime() : Number.MAX_SAFE_INTEGER;
    if (firstDate !== secondDate)
        return firstDate - secondDate;
    return (a?.id || 0) - (b?.id || 0);
};
const toArabicReligion = (value) => value === 'MUSLIM' ? 'مسلم' : value === 'CHRISTIAN' ? 'مسيحي' : 'آخر';
const toArabicGender = (value) => (value === 'MALE' ? 'ذكر' : 'أنثى');
const toArabicMaritalStatus = (value, gender) => {
    if (value === 'MARRIED')
        return gender === 'MALE' ? 'متزوج' : 'متزوجة';
    if (value === 'DIVORCED')
        return gender === 'MALE' ? 'مطلق' : 'مطلقة';
    if (value === 'WIDOWED')
        return gender === 'MALE' ? 'أرمل' : 'أرملة';
    return gender === 'MALE' ? 'أعزب' : 'عزباء';
};
// ====================== 1. بيان عائلي (مع ملاحظات محسنة) ======================
const generateFamilyRecord = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const user = await prisma_1.default.user.findUnique({ where: { id: userId } });
        if (!user)
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
        const transactionId = `NFS-FAMILY-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
        const familyMembers = [];
        const pushUnique = (member) => {
            if (!member || familyMembers.some(m => m.id === member.id))
                return;
            familyMembers.push(member);
        };
        let familyHead = user;
        if (user.gender === 'MALE' && (user.maritalStatus === 'MARRIED' || user.maritalStatus === 'WIDOWED' || user.maritalStatus === 'DIVORCED')) {
            familyHead = user;
        }
        else if (user.husbandId) {
            familyHead = await prisma_1.default.user.findUnique({ where: { id: user.husbandId } }) || user;
        }
        else if (user.fatherId) {
            familyHead = await prisma_1.default.user.findUnique({ where: { id: user.fatherId } }) || user;
        }
        pushUnique(familyHead);
        const wives = await prisma_1.default.user.findMany({
            where: { husbandId: familyHead.id, gender: 'FEMALE' },
            orderBy: [{ registrationDate: 'asc' }, { id: 'asc' }],
        });
        wives.forEach(pushUnique);
        const children = await prisma_1.default.user.findMany({
            where: { fatherId: familyHead.id },
            orderBy: [{ dateOfBirth: 'asc' }, { id: 'asc' }],
        });
        children.sort(sortByOldest).forEach(pushUnique);
        const familyMemberIds = familyMembers.map((member) => member.id);
        const approvedDeaths = await prisma_1.default.deathRequest.findMany({
            where: {
                status: 'APPROVED',
                userId: { in: familyMemberIds },
            },
            orderBy: { checkedAt: 'desc' },
        });
        const deathDateByUserId = new Map();
        approvedDeaths.forEach((death) => {
            if (deathDateByUserId.has(death.userId))
                return;
            deathDateByUserId.set(death.userId, death.deathDate || death.checkedAt || death.createdAt);
        });
        const approvedMarriages = await prisma_1.default.marriageInfo.findMany({
            where: {
                status: 'APPROVED',
                OR: [{ husbandId: { in: familyMemberIds } }, { wifeId: { in: familyMemberIds } }],
            },
            orderBy: { updatedAt: 'desc' },
        });
        const marriageDateByUserId = new Map();
        approvedMarriages.forEach((marriage) => {
            const marriageDate = marriage.marriageDate || marriage.updatedAt || marriage.createdAt;
            if (!marriageDateByUserId.has(marriage.husbandId)) {
                marriageDateByUserId.set(marriage.husbandId, marriageDate);
            }
            if (!marriageDateByUserId.has(marriage.wifeId)) {
                marriageDateByUserId.set(marriage.wifeId, marriageDate);
            }
        });
        const rowsHtml = familyMembers.map((member) => {
            let notes = '—';
            const deathDate = deathDateByUserId.get(member.id);
            const marriageDate = marriageDateByUserId.get(member.id);
            if (deathDate) {
                notes = `متوفى بتاريخ: ${deathDate.toISOString().split('T')[0]}`;
            }
            else if (marriageDate) {
                const statusText = member.gender === 'MALE' ? 'متزوج' : 'متزوجة';
                notes = `${statusText} بتاريخ: ${marriageDate.toISOString().split('T')[0]}`;
            }
            return `
        <tr>
          <td>${member.nationalId || '—'}</td>
          <td>${member.firstName || '—'} ${member.nisba || ''}</td>
          <td>${member.nisba || '—'}</td>
          <td>${member.fatherName || '—'}</td>
          <td>${member.motherName || '—'} ${member.motherNisba ? `(${member.motherNisba})` : ''}</td>
          <td>${member.religion === 'MUSLIM' ? 'مسلم' : member.religion === 'CHRISTIAN' ? 'مسيحي' : 'آخر'}</td>
          <td>${member.placeOfBirth || '—'} - ${member.dateOfBirth ? member.dateOfBirth.toISOString().split('T')[0] : '—'}</td>
          <td>${member.maritalStatus === 'MARRIED'
                ? (member.gender === 'MALE' ? 'متزوج' : 'متزوجة')
                : member.maritalStatus === 'SINGLE'
                    ? (member.gender === 'MALE' ? 'أعزب' : 'عزباء')
                    : member.maritalStatus === 'DIVORCED'
                        ? (member.gender === 'MALE' ? 'مطلق' : 'مطلقة')
                        : (member.gender === 'MALE' ? 'أرمل' : 'أرملة')}</td>
          <td>${member.gender === 'MALE' ? 'ذكر' : 'أنثى'}</td>
          <td>${member.nationality || '—'}</td>
          <td>${member.registrationDate ? member.registrationDate.toISOString().split('T')[0] : '—'}</td>
          <td>${notes}</td>
        </tr>`;
        }).join('');
        const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>بيان عائلي</title>
        <style>
          @page { size: A4 landscape; margin: 6mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: 100%; }
          body { 
            font-family: 'Amiri', Arial, sans-serif; 
            padding: 0; 
            background: white; 
            color: #1a1a1a; 
            line-height: 1.25; 
            font-size: 10.5px;
          }
          .header { 
            text-align: center; 
            margin-bottom: 6px; 
            padding-bottom: 5px; 
            border-bottom: 2px solid #0b3d2e; 
          }
          .emblem { height: 42px; margin-bottom: 3px; }
          h1 { font-size: 14px; color: #0b3d2e; margin: 2px 0; font-weight: 700; }
          h2 { font-size: 11px; color: #333; }
          h3 { font-size: 12px; color: #0b3d2e; font-weight: 700; }

          .record-meta {
            display: grid;
            grid-template-columns: 1fr 82px;
            gap: 6px;
            align-items: stretch;
            margin-bottom: 6px;
          }
          .family-info { 
            padding: 5px; 
            background: #f0e6d2; 
            border: 1px solid #0b3d2e; 
            font-size: 10.5px; 
          }
          .qr-box {
            border: 1px solid #0b3d2e;
            background: #f9f5eb;
            padding: 4px;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 4px;
          }
          .qr-box img {
            width: 56px;
            height: 56px;
            border: 1px solid #444;
          }
          .qr-id {
            font-size: 7px;
            font-weight: bold;
            color: #0b3d2e;
            direction: ltr;
            word-break: break-all;
          }

          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 6px 0; 
          }
          th, td { 
            border: 1px solid #444; 
            padding: 3px 4px; 
            text-align: right; 
            font-size: 9.5px; 
          }
          th { 
            background: #e8dcc8; 
            font-weight: 700; 
          }

          .footer { 
            margin-top: 6px; 
            text-align: center; 
            font-size: 9.5px; 
            color: #444; 
            border-top: 1px solid #999; 
            padding-top: 5px; 
          }
          .signatures {
            margin-top: 10px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            gap: 20px;
            font-size: 10px;
          }
          .signature-box {
            flex: 1;
            text-align: center;
            border-top: 1px solid #333;
            padding-top: 4px;
          }
          .stamp {
            width: 62px;
            height: 62px;
            border: 3px double #8B0000;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 4px;
            color: #8B0000;
            font-weight: bold;
            font-size: 9px;
            transform: rotate(-8deg);
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${EMBLEM_URL}" class="emblem" alt="شعار"/>
          <h1>الجمهورية العربية السورية</h1>
          <h2>وزارة الداخلية - السجل المدني</h2>
          <h3>بيان عائلي</h3>
        </div>

        <div class="record-meta">
          <div class="family-info">
            <strong>المحافظة:</strong> ${familyHead.governorate} &nbsp;&nbsp;&nbsp;
            <strong>الأمانة:</strong> ${familyHead.amanah || '—'} &nbsp;&nbsp;&nbsp;
            <strong>محل ورقم القيد:</strong> ${familyHead.registrationPlace} / ${familyHead.registrationNumber || '—'}
          </div>
          <div class="qr-box">
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${transactionId}" alt="QR Code"/>
            <div class="qr-id">${transactionId}</div>
          </div>
        </div>

        <table>
          <thead>
            <tr>
              <th>الرقم الوطني</th>
              <th>الاسم</th>
              <th>النسبة</th>
              <th>اسم الأب</th>
              <th>اسم الأم ونسبتها</th>
              <th>الدين</th>
              <th>محل وتاريخ الولادة</th>
              <th>الوضع العائلي</th>
              <th>الجنس</th>
              <th>الجنسية</th>
              <th>تاريخ التسجيل</th>
              <th>ملاحظات</th>
            </tr>
          </thead>
          <tbody>${rowsHtml}</tbody>
        </table>

        <div class="signatures" style="margin-top: 10px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div class="signature-box">
            توقيع صاحب العلاقة<br>
            <span style="font-size: 9px; color: #555;">....................</span>
          </div>
          <div class="signature-box">
            <div class="stamp">خاتم<br>السجل المدني</div>
          </div>
          <div class="signature-box">
            توقيع الموظف المختص<br>
            <span style="font-size: 9px; color: #555;">....................</span>
          </div>
        </div>

        <div class="footer">
          بيان صادر عن النظام الإلكتروني للشؤون المدنية بتاريخ: ${new Date().toLocaleDateString('ar-SY')}<br>
          وصالح لغاية: ${new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('ar-SY')}
        </div>
      </body>
      </html>`;
        const pdf = await (0, pdfGenerator_1.generatePDF)(html, `بيان_عائلي_${user.nationalId}`, true); // landscape
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="family-record-${user.nationalId}.pdf"`);
        return res.send(pdf.buffer);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'فشل في توليد بيان العائلي' });
    }
};
exports.generateFamilyRecord = generateFamilyRecord;
// ====================== 2. بيان فردي (تصميم محسن - بدون فراغات زائدة) ======================
const generateIndividualRecord = async (req, res) => {
    try {
        const userId = req.user?.userId;
        const user = await prisma_1.default.user.findUnique({ where: { id: userId } });
        if (!user)
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
        const transactionId = `NFS-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
        const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>بيان قيد فردي مدني</title>
        <style>
          @page { size: A4 portrait; margin: 6mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: 100%; }
          body { 
            font-family: 'Amiri', Arial, sans-serif; 
            background: white; 
            color: #1a1a1a; 
            line-height: 1.3; 
            font-size: 11px;
          }
          .header { 
            text-align: center; 
            margin-bottom: 8px; 
            padding-bottom: 6px; 
            border-bottom: 2px solid #0b3d2e; 
          }
          .emblem { height: 48px; margin-bottom: 4px; }
          h1 { font-size: 15px; color: #0b3d2e; margin: 2px 0; font-weight: 700; }
          h2 { font-size: 11px; color: #333; }
          h3 { font-size: 13px; color: #0b3d2e; font-weight: 700; }

          .content { 
            display: grid; 
            grid-template-columns: 1fr 135px; 
            gap: 10px; 
            margin-top: 8px; 
          }
          .main-content { grid-column: 1; }
          .sidebar { 
            grid-column: 2; 
            border: 1px solid #444; 
            padding: 7px; 
            background: #f9f5eb; 
            text-align: center; 
            height: fit-content; 
          }
          .photo-box { 
            width: 100%; 
            aspect-ratio: 3/4; 
            border: 1px solid #555; 
            background: #f0f0f0; 
            margin-bottom: 6px; 
            overflow: hidden; 
          }
          .photo-box img { width: 100%; height: 100%; object-fit: cover; }

          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 8px; 
          }
          th, td { 
            border: 1px solid #555; 
            padding: 5px 7px; 
            text-align: right; 
          }
          th { 
            background: #e8dcc8; 
            font-weight: 700; 
            width: 37%; 
          }

          .signatures {
            margin-top: 12px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            gap: 20px;
          }
          .signature-box {
            flex: 1;
            text-align: center;
            border-top: 1px solid #333;
            padding-top: 5px;
            font-size: 10.5px;
          }
          .stamp {
            width: 68px;
            height: 68px;
            border: 3px double #8B0000;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 4px;
            color: #8B0000;
            font-weight: bold;
            font-size: 9px;
            transform: rotate(-8deg);
          }

          .footer { 
            margin-top: 8px; 
            text-align: center; 
            font-size: 10px; 
            color: #444; 
            border-top: 1px solid #999; 
            padding-top: 5px; 
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${EMBLEM_URL}" class="emblem" alt="شعار"/>
          <h1>الجمهورية العربية السورية</h1>
          <h2>وزارة الداخلية - السجل المدني</h2>
          <h3>بيان قيد فردي مدني</h3>
        </div>

        <div class="content">
          <div class="main-content">
            <table>
              <tr><th>الرقم الوطني</th><td>${user.nationalId}</td></tr>
              <tr><th>الاسم</th><td>${user.firstName} ${user.nisba || ''}</td></tr>
              <tr><th>اسم الأب</th><td>${user.fatherName}</td></tr>
              <tr><th>اسم الجد</th><td>${user.grandfatherName || '—'}</td></tr>
              <tr><th>اسم الأم ونسبتها</th><td>${user.motherName} ${user.motherNisba ? `(${user.motherNisba})` : ''}</td></tr>
              <tr><th>محل وتاريخ الولادة</th><td>${user.placeOfBirth} - ${user.dateOfBirth.toISOString().split('T')[0]}</td></tr>
              <tr><th>الجنسية</th><td>${user.nationality}</td></tr>
              <tr><th>المحافظة</th><td>${user.governorate}</td></tr>
              <tr><th>الأمانة</th><td>${user.amanah || '—'}</td></tr>
              <tr><th>محل ورقم القيد</th><td>${user.registrationPlace} / ${user.registrationNumber || '—'}</td></tr>
              <tr><th>الجنس</th><td>${user.gender === 'MALE' ? 'ذكر' : 'أنثى'}</td></tr>
              <tr><th>الدين</th><td>${user.religion === 'MUSLIM' ? 'مسلم' : user.religion === 'CHRISTIAN' ? 'مسيحي' : 'آخر'}</td></tr>
              <tr><th>الوضع العائلي</th><td>
                ${user.maritalStatus === 'MARRIED'
            ? (user.gender === 'MALE' ? 'متزوج' : 'متزوجة')
            : user.maritalStatus === 'SINGLE'
                ? (user.gender === 'MALE' ? 'أعزب' : 'عزباء')
                : user.maritalStatus === 'DIVORCED'
                    ? (user.gender === 'MALE' ? 'مطلق' : 'مطلقة')
                    : (user.gender === 'MALE' ? 'أرمل' : 'أرملة')}
              </td></tr>
              <tr><th>رقم البطاقة</th><td>${user.cardNumber || '—'}</td></tr>
              <tr><th>تاريخ التسجيل</th><td>${user.registrationDate ? user.registrationDate.toISOString().split('T')[0] : '—'}</td></tr>
              <tr><th>تاريخ الإصدار</th><td>${user.issueDate ? user.issueDate.toISOString().split('T')[0] : '—'}</td></tr>
            </table>
          </div>

          <!-- الجانب الأيمن (مضغوط) -->
          <div class="sidebar">
            <div class="photo-box">
              ${user.personalPhoto ? `<img src="http://localhost:5000${user.personalPhoto}" alt="صورة شخصية" />` : '<span>لا توجد صورة</span>'}
            </div>
            
            <div style="margin: 8px 0 5px;">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${transactionId}" alt="QR Code" style="width: 82px; height: 82px; border: 1px solid #444;"/>
            </div>
            <div style="font-size: 9px; font-weight: bold; color: #0b3d2e; word-break: break-all;">
              ${transactionId}
            </div>
          </div>
        </div>

        <!-- منطقة التوقيعات -->
        <div class="signatures" style="margin-top: 12px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div class="signature-box">
            توقيع صاحب العلاقة<br>
            <span style="font-size: 9px; color: #555;">${user.firstName} ${user.nisba || ''}</span>
          </div>
          <div class="signature-box">
            <div class="stamp">خاتم<br>السجل المدني</div>
          </div>
          <div class="signature-box" >
            توقيع الموظف المختص<br>
            <span style="font-size: 9px; color: #555;">....................</span>
          </div>
        </div>

        <div class="footer">
          بيان صادر عن النظام الإلكتروني للشؤون المدنية<br>
          تاريخ الإصدار: ${new Date().toLocaleDateString('ar-SY')} | صالح لغاية: ${new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('ar-SY')}
        </div>
      </body>
      </html>`;
        const pdf = await (0, pdfGenerator_1.generatePDF)(html, `بيان_فردي_${user.nationalId}`, false);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="individual-record-${user.nationalId}.pdf"`);
        return res.send(pdf.buffer);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'فشل في توليد البيان الفردي' });
    }
};
exports.generateIndividualRecord = generateIndividualRecord;
// ====================== 3. بيان زواج ======================
const generateMarriageCertificate = async (req, res) => {
    try {
        const currentUserId = req.user?.userId;
        if (!currentUserId)
            return res.status(401).json({ success: false, message: 'غير مصرح' });
        const currentUser = await prisma_1.default.user.findUnique({ where: { id: currentUserId } });
        if (!currentUser)
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
        const marriage = await prisma_1.default.marriageInfo.findFirst({
            where: {
                status: 'APPROVED',
                OR: [
                    { husbandId: currentUserId },
                    { wifeId: currentUserId }
                ]
            },
            include: {
                husband: {
                    select: {
                        id: true,
                        nationalId: true,
                        firstName: true,
                        nisba: true,
                        fatherName: true,
                        grandfatherName: true,
                        motherName: true,
                        placeOfBirth: true,
                        dateOfBirth: true,
                        nationality: true,
                        governorate: true,
                        amanah: true,
                        registrationPlace: true,
                        registrationNumber: true,
                        religion: true,
                    }
                },
                wife: {
                    select: {
                        id: true,
                        nationalId: true,
                        firstName: true,
                        nisba: true,
                        fatherName: true,
                        grandfatherName: true,
                        motherName: true,
                        placeOfBirth: true,
                        dateOfBirth: true,
                        nationality: true,
                        governorate: true,
                        amanah: true,
                        registrationPlace: true,
                        registrationNumber: true,
                        religion: true,
                    }
                }
            }
        });
        if (!marriage)
            return res.status(400).json({ success: false, message: 'لا يوجد سجل زواج مرتبط بهذا الحساب' });
        const otherSpouse = marriage.husband.id === currentUserId ? marriage.wife : marriage.husband;
        const husband = currentUser.gender === 'MALE' ? currentUser : otherSpouse;
        const wife = currentUser.gender === 'FEMALE' ? currentUser : otherSpouse;
        const documentIdentifier = `marriage:${marriage.id}:${currentUserId}:${Date.now()}`;
        const qrPayload = JSON.stringify({
            type: 'marriage_certificate',
            marriageId: marriage.id,
            issuedFor: currentUserId,
            issuedAt: new Date().toISOString(),
            documentIdentifier,
        });
        const qrCodeDataUrl = await qrcode_1.default.toDataURL(qrPayload, {
            errorCorrectionLevel: 'H',
            width: 220,
            margin: 1,
        });
        const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>بيان زواج</title>
        <style>
          @page { size: A4 landscape; margin: 6mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: 100%; }
          body { font-family: 'Amiri', Arial, sans-serif; padding: 0; background: white; color: #1a1a1a; display: flex; flex-direction: column; min-height: 100vh; font-size: 10.5px; line-height: 1.25; }
          .content-wrapper { flex: 1; }
          .header { text-align: center; margin-bottom: 6px; padding-bottom: 5px; border-bottom: 2px solid #0b3d2e; position: relative; }
          .header-qr { position: absolute; top: 0; right: 0; width: 62px; }
          .header-qr img { width: 56px; height: 56px; border: 1px solid #999; }
          .header-qr-label { font-size: 7px; color: #666; margin-top: 1px; }
          .emblem { height: 42px; margin-bottom: 3px; }
          h1 { font-size: 14px; color: #0b3d2e; margin: 2px 0; font-weight: 700; }
          h2 { font-size: 11px; color: #333; margin: 1px 0; font-weight: 600; }
          h3 { font-size: 12px; color: #0b3d2e; margin: 2px 0; font-weight: 700; }
          .section-title { background: #0b3d2e; color: white; padding: 4px 7px; margin: 6px 0 5px 0; text-align: center; font-size: 11px; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; border-spacing: 0; margin-bottom: 6px; border: 1px solid #444; }
          th, td { border: 1px solid #444; padding: 4px 6px; text-align: right; vertical-align: middle; line-height: 1.25; font-size: 10px; }
          th { background: #e8dcc8; font-weight: 700; }
          .footer { margin-top: auto; padding-top: 6px; text-align: center; border-top: 1px solid #999; font-size: 9px; color: #555; line-height: 1.25; }
          .signatures { margin-top: 8px; display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; font-size: 10px; font-weight: 600; }
          .signature-box { flex: 1; border-top: 1px solid #333; padding-top: 4px; text-align: center; }
          .stamp {
            width: 62px;
            height: 62px;
            border: 3px double #8B0000;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 4px;
            color: #8B0000;
            font-weight: bold;
            font-size: 9px;
            transform: rotate(-8deg);
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${EMBLEM_URL}" class="emblem" alt="شعار"/>
          <h1>الجمهورية العربية السورية</h1>
          <h2>وزارة الداخلية - السجل المدني</h2>
          <h3>بيان زواج</h3>
          <div class="header-qr">
            <img src="${qrCodeDataUrl}" alt="QR Code" />
            <div class="header-qr-label">تحقق</div>
          </div>
        </div>

        <div class="section-title">بيانات الزوج والزوجة</div>
        <table>
          <tr><th>البيان</th><th>الزوج</th><th>الزوجة</th></tr>
          <tr><td>الرقم الوطني</td><td>${husband.nationalId}</td><td>${wife.nationalId}</td></tr>
          <tr><td>الاسم</td><td>${formatName(husband.firstName, husband.nisba)}</td><td>${formatName(wife.firstName, wife.nisba)}</td></tr>
          <tr><td>اسم الأب</td><td>${formatCell(husband.fatherName)}</td><td>${formatCell(wife.fatherName)}</td></tr>
          <tr><td>اسم الجد</td><td>${formatCell(husband.grandfatherName)}</td><td>${formatCell(wife.grandfatherName)}</td></tr>
          <tr><td>اسم الأم</td><td>${formatCell(husband.motherName)}</td><td>${formatCell(wife.motherName)}</td></tr>
          <tr><td>محل وتاريخ الولادة</td><td>${formatCell(husband.placeOfBirth)} - ${husband.dateOfBirth.toISOString().split('T')[0]}</td><td>${formatCell(wife.placeOfBirth)} - ${wife.dateOfBirth.toISOString().split('T')[0]}</td></tr>
          <tr><td>الجنسية</td><td>${husband.nationality}</td><td>${wife.nationality}</td></tr>
          <tr><td>المحافظة</td><td>${husband.governorate}</td><td>${wife.governorate}</td></tr>
          <tr><td>الأمانة</td><td>${formatCell(husband.amanah)}</td><td>${formatCell(wife.amanah)}</td></tr>
          <tr><td>محل ورقم القيد</td><td>${formatCell(husband.registrationPlace)} / ${formatCell(husband.registrationNumber)}</td><td>${formatCell(wife.registrationPlace)} / ${formatCell(wife.registrationNumber)}</td></tr>
          <tr><td>الدين</td><td>${husband.religion === 'MUSLIM' ? 'مسلم' : husband.religion === 'CHRISTIAN' ? 'مسيحي' : 'آخر'}</td><td>${wife.religion === 'MUSLIM' ? 'مسلم' : wife.religion === 'CHRISTIAN' ? 'مسيحي' : 'آخر'}</td></tr>
        </table>

        <div class="section-title" style="margin-top: 6px;">بيانات عقد الزواج</div>
        <table>
          <tr><th>تاريخ الزواج</th><td>${marriage.marriageDate ? marriage.marriageDate.toISOString().split('T')[0] : '—'}</td></tr>
          <tr><th>محل الزواج</th><td>${formatCell(marriage.marriagePlace)}</td></tr>
        </table>

        <div class="footer">
          صادر عن النظام الإلكتروني للشؤون المدنية بتاريخ ${new Date().toLocaleDateString('ar-SY')}<br>
          صالح حتى ${new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('ar-SY')}
        </div>

        <div class="signatures">
          <div>توقيع الزوج</div>
          <div>توقيع الزوجة</div>
          <div>الموظف المختص</div>
        </div>
      </body>
      </html>`;
        const pdf = await (0, pdfGenerator_1.generatePDF)(html, `بيان_زواج_${currentUser.nationalId}`, true);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="marriage-certificate-${currentUser.nationalId}.pdf"`);
        return res.send(pdf.buffer);
    }
    catch (error) {
        console.error('Generate Marriage Certificate Error:', error);
        return res.status(500).json({ success: false, message: 'فشل في توليد بيان الزواج', error: error.message });
    }
};
exports.generateMarriageCertificate = generateMarriageCertificate;
// ====================== 4.تقرير وفاة ======================
const generateDeathReport = async (req, res) => {
    try {
        const requesterId = req.user?.userId;
        const targetNationalId = typeof req.query.nationalId === 'string'
            ? req.query.nationalId.trim()
            : typeof req.query.userId === 'string' && /^\d{10}$/.test(req.query.userId.trim())
                ? req.query.userId.trim()
                : null;
        const targetUserId = targetNationalId
            ? null
            : req.query.userId
                ? Number(req.query.userId)
                : requesterId;
        if (!requesterId || (!targetNationalId && (!targetUserId || isNaN(targetUserId)))) {
            return res.status(400).json({ success: false, message: 'بيانات الطلب غير صحيحة' });
        }
        const requester = await prisma_1.default.user.findUnique({ where: { id: requesterId } });
        if (!requester)
            return res.status(404).json({ success: false, message: 'مقدم الطلب غير موجود' });
        const deceased = targetNationalId
            ? await prisma_1.default.user.findUnique({ where: { nationalId: targetNationalId } })
            : await prisma_1.default.user.findUnique({ where: { id: targetUserId } });
        if (!deceased)
            return res.status(404).json({ success: false, message: 'الشخص المتوفى غير موجود' });
        // التحقق من وجود طلب وفاة معتمد
        const deathRequest = await prisma_1.default.deathRequest.findFirst({
            where: {
                userId: deceased.id,
                status: 'APPROVED'
            },
            orderBy: { checkedAt: 'desc' }
        });
        if (!deathRequest) {
            return res.status(400).json({ success: false, message: 'لا يوجد طلب وفاة معتمد لهذا الشخص' });
        }
        if (deceased.isAlive) {
            return res.status(400).json({ success: false, message: 'هذا الشخص ما زال على قيد الحياة' });
        }
        const transactionId = `NFS-DEATH-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
        const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>تقرير وفاة</title>
        <style>
          @page { size: A4 portrait; margin: 6mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          html, body { width: 100%; }
          body { 
            font-family: 'Amiri', Arial, sans-serif; 
            background: white; 
            color: #1a1a1a; 
            line-height: 1.3; 
            font-size: 11px;
          }
          .header { text-align: center; margin-bottom: 8px; padding-bottom: 6px; border-bottom: 2px solid #8B0000; }
          .emblem { height: 48px; margin-bottom: 4px; }
          h1 { font-size: 15px; color: #8B0000; margin: 2px 0; font-weight: 700; }
          h3 { font-size: 13px; color: #8B0000; margin: 8px 0 5px 0; font-weight: 700; }

          .content { display: grid; grid-template-columns: 1fr 135px; gap: 10px; margin-top: 8px; }
          .main-content { grid-column: 1; }
          .sidebar { grid-column: 2; border: 1px solid #8B0000; padding: 7px; background: #fdf2f2; text-align: center; height: fit-content; }
          .photo-box { width: 100%; aspect-ratio: 3/4; border: 1px solid #8B0000; background: #f0f0f0; margin-bottom: 6px; overflow: hidden; }
          .photo-box img { width: 100%; height: 100%; object-fit: cover; }

          table { width: 100%; border-collapse: collapse; margin-bottom: 8px; }
          th, td { border: 1px solid #555; padding: 5px 7px; text-align: right; }
          th { background: #f0d9d9; font-weight: 700; width: 37%; }

          .signatures { margin-top: 12px; display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; }
          .signature-box { flex: 1; text-align: center; border-top: 1px solid #333; padding-top: 5px; font-size: 10.5px; }
          .stamp { 
            width: 68px; height: 68px; border: 3px double #8B0000; border-radius: 50%; 
            display: flex; align-items: center; justify-content: center; margin: 0 auto 4px;
            color: #8B0000; font-weight: bold; font-size: 9px; transform: rotate(-8deg);
          }

          .footer { margin-top: 8px; text-align: center; font-size: 10px; color: #444; border-top: 1px solid #999; padding-top: 5px; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${EMBLEM_URL}" class="emblem" alt="شعار"/>
          <h1>الجمهورية العربية السورية</h1>
          <h2>وزارة الداخلية - السجل المدني</h2>
          <h3>تقرير وفاة</h3>
        </div>

        <div class="content">
          <div class="main-content">
            <table>
              <tr><th>الرقم الوطني</th><td>${deceased.nationalId}</td></tr>
              <tr><th>الاسم</th><td>${deceased.firstName} ${deceased.nisba || ''}</td></tr>
              <tr><th>اسم الأب</th><td>${deceased.fatherName}</td></tr>
              <tr><th>اسم الجد</th><td>${deceased.grandfatherName || '—'}</td></tr>
              <tr><th>اسم الأم ونسبتها</th><td>${deceased.motherName} ${deceased.motherNisba ? `(${deceased.motherNisba})` : ''}</td></tr>
              <tr><th>محل وتاريخ الولادة</th><td>${deceased.placeOfBirth} - ${deceased.dateOfBirth.toISOString().split('T')[0]}</td></tr>
              <tr><th>الجنسية</th><td>${deceased.nationality}</td></tr>
              <tr><th>المحافظة</th><td>${deceased.governorate}</td></tr>
              <tr><th>الأمانة</th><td>${deceased.amanah || '—'}</td></tr>
              <tr><th>محل ورقم القيد</th><td>${deceased.registrationPlace} / ${deceased.registrationNumber || '—'}</td></tr>
              <tr><th>الجنس</th><td>${deceased.gender === 'MALE' ? 'ذكر' : 'أنثى'}</td></tr>
              <tr><th>الدين</th><td>${deceased.religion === 'MUSLIM' ? 'مسلم' : deceased.religion === 'CHRISTIAN' ? 'مسيحي' : 'آخر'}</td></tr>
            </table>

            <h3 style="margin: 8px 0 5px; color: #8B0000;">بيانات الوفاة</h3>
            <table>
              <tr><th>تاريخ الوفاة</th><td>${deathRequest.deathDate ? deathRequest.deathDate.toISOString().split('T')[0] : formatDate(deathRequest.checkedAt)}</td></tr>
              <tr><th>مكان الوفاة</th><td>${deathRequest.deathPlace || '—'}</td></tr>
            </table>
          </div>

          <div class="sidebar">
            <div class="photo-box">
              ${deceased.personalPhoto ? `<img src="http://localhost:5000${deceased.personalPhoto}" alt="صورة" />` : '<span>لا توجد صورة</span>'}
            </div>
            <div style="margin: 8px 0 5px;">
              <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${transactionId}" alt="QR" style="width: 82px; height: 82px;"/>
            </div>
            <div style="font-size: 9px; font-weight: bold; color: #8B0000; word-break: break-all;">${transactionId}</div>
          </div>
        </div>

        <div class="signatures" style="margin-top: 10px;">
          <div class="signature-box">توقيع صاحب العلاقة<br><span style="color:#555;">${requester.firstName} ${requester.nisba || ''}</span></div>
          <div class="signature-box"><div class="stamp">خاتم<br>السجل المدني</div></div>
          <div class="signature-box">توقيع الموظف المختص<br><span style="color:#555;">....................</span></div>
        </div>

        <div class="footer">
          بيان صادر عن النظام الإلكتروني للشؤون المدنية<br>
          تاريخ الإصدار: ${new Date().toLocaleDateString('ar-SY')} | صالح لغاية: ${new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('ar-SY')}
        </div>
      </body>
      </html>`;
        const pdf = await (0, pdfGenerator_1.generatePDF)(html, `تقرير_وفاة_${deceased.nationalId}`, false);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="death-report-${deceased.nationalId}.pdf"`);
        return res.send(pdf.buffer);
    }
    catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'فشل في توليد تقرير الوفاة' });
    }
};
exports.generateDeathReport = generateDeathReport;
