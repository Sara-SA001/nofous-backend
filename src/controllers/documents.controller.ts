import { Request, Response } from 'express';
import prisma from '../utils/prisma';
import { generatePDF } from '../utils/pdfGenerator';
import QRCode from 'qrcode';

const EMBLEM_PATH = '/images/syria-emblem-2025.png';

const getAbsoluteUrl = (req: Request, relativePath?: string | null) => {
  if (!relativePath) return null;
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}${relativePath}`;
};

const normalizeText = (value?: string | null) => value?.toString().replace(/\s+/g, ' ').trim() || '';
const formatCell = (value?: string | null) => normalizeText(value) || '—';
const formatName = (name: string, nisba?: string | null) => `${normalizeText(name)}${nisba ? ' ' + normalizeText(nisba) : ''}`.trim();
const formatDate = (value?: Date | null) => (value ? value.toISOString().split('T')[0] : '—');
const toArabicReligion = (value: 'MUSLIM' | 'CHRISTIAN' | 'OTHER') =>
  value === 'MUSLIM' ? '����' : value === 'CHRISTIAN' ? '�����' : '���';
const toArabicGender = (value: 'MALE' | 'FEMALE') => (value === 'MALE' ? '���' : '����');
const toArabicMaritalStatus = (value: 'SINGLE' | 'MARRIED' | 'DIVORCED' | 'WIDOWED', gender: 'MALE' | 'FEMALE') => {
  if (value === 'MARRIED') return gender === 'MALE' ? '�����' : '������';
  if (value === 'DIVORCED') return gender === 'MALE' ? '����' : '�����';
  if (value === 'WIDOWED') return gender === 'MALE' ? '����' : '�����';
  return gender === 'MALE' ? '����' : '�����';
};

// ====================== 1. بيان عائلي (ترتيب عائلي رسمي) ======================
export const generateFamilyRecord = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        father: true,
        husband: true,
        wives: {
          include: { children: true }
        },
        children: true
      }
    });

    if (!user) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });

    const isMale = user.gender === 'MALE';
    const familyHead = isMale ? user : user.husband || user.father;

    // جمع الزوجات والأولاد
    let wives = user.wives || [];
    if (!isMale && user.husband) {
      wives = await prisma.user.findMany({
        where: { husbandId: user.husband.id },
        include: { children: true }
      });
    }
    const emblemUrl = getAbsoluteUrl(req, EMBLEM_PATH);
    let html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>بيان عائلي</title>
        <style>
          body { font-family: 'Amiri', Arial, sans-serif; padding: 30px; line-height: 1.8; }
          .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #0b3d2e; padding-bottom: 20px; }
          .emblem { height: 100px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          th, td { border: 1px solid #444; padding: 10px; text-align: right; }
          th { background: #f0e6d2; font-weight: bold; }
          .mother-row { background: #f8f1e3; font-weight: bold; }
          .child-row { background: #fafafa; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${emblemUrl}" class="emblem" alt="شعار"/>
          <h1>الجمهورية العربية السورية</h1>
          <h2>وزارة الداخلية - السجل المدني</h2>
          <h3>بيان عائلي</h3>
        </div>

        <table>
          <thead>
            <tr>
              <th>الرقم الوطني</th>
              <th>الاسم</th>
              <th>اسم الأب</th>
              <th>اسم الجد</th>
              <th>اسم الأم</th>
              <th>تاريخ الولادة</th>
              <th>الجنس</th>
              <th>الدين</th>
              <th>الوضع العائلي</th>
            </tr>
          </thead>
          <tbody>
    `;

    // 1. الأب (رأس العائلة)
    if (familyHead) {
      html += `
        <tr style="background:#e6f0e6; font-weight:bold;">
          <td>${familyHead.nationalId}</td>
          <td>${familyHead.firstName} ${familyHead.nisba || ''}</td>
          <td>${familyHead.fatherName}</td>
          <td>${familyHead.grandfatherName || '—'}</td>
          <td>${familyHead.motherName}</td>
          <td>${formatDate(familyHead.dateOfBirth)}</td>
          <td>${familyHead.gender === 'MALE' ? 'ذكر' : 'أنثى'}</td>
          <td>${toArabicReligion(familyHead.religion)}</td>
          <td>رأس العائلة</td>
        </tr>`;
    }

    // 2. الزوجات + أولادهن
    wives.forEach((wife: any) => {
      html += `
        <tr class="mother-row">
          <td>${wife.nationalId}</td>
          <td>${wife.firstName} ${wife.nisba || ''}</td>
          <td>${wife.fatherName}</td>
          <td>${wife.grandfatherName || '—'}</td>
          <td>${wife.motherName}</td>
          <td>${formatDate(wife.dateOfBirth)}</td>
          <td>أنثى</td>
          <td>${toArabicReligion(wife.religion)}</td>
          <td>زوجة</td>
        </tr>`;

      // أولاد هذه الزوجة
      if (wife.children && wife.children.length > 0) {
        wife.children.forEach((child: any) => {
          html += `
            <tr class="child-row">
              <td>${child.nationalId}</td>
              <td>${child.firstName} ${child.nisba || ''}</td>
              <td>${child.fatherName}</td>
              <td>${child.grandfatherName || '—'}</td>
              <td>${child.motherName}</td>
              <td>${formatDate(child.dateOfBirth)}</td>
              <td>${child.gender === 'MALE' ? 'ذكر' : 'أنثى'}</td>
              <td>${toArabicReligion(child.religion)}</td>
              <td>ابن/ابنة</td>
            </tr>`;
        });
      }
    });

    html += `</tbody></table>`;

    // الفوتر
    html += `
      <div style="margin-top: 60px; text-align: center; color: #444;">
        <p>بيان صادر عن النظام الإلكتروني للشؤون المدنية</p>
        <p>تاريخ الإصدار: ${new Date().toLocaleDateString('ar-SY')} | صالح لغاية: ${new Date(Date.now() + 90*24*60*60*1000).toLocaleDateString('ar-SY')}</p>
      </div>
    `;

    const pdf = await generatePDF(html, `بيان_عائلي_${user.nationalId}`, true);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="family-record-${user.nationalId}.pdf"`);
    return res.send(pdf.buffer);

  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: 'فشل في توليد البيان العائلي' });
  }
};
// ====================== 2. بيان فردي (تصميم محسن - بدون فراغات زائدة) ======================
export const generateIndividualRecord = async (req: Request, res: Response) => {
  try {
    const userId = req.user?.userId;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });

    const transactionId = `NFS-${Date.now()}-${Math.floor(Math.random() * 100000)}`;
    const emblemUrl = getAbsoluteUrl(req, EMBLEM_PATH);
    const photoUrl = user.personalPhoto ? getAbsoluteUrl(req, user.personalPhoto) : null;

    const qrCodeDataUrl = await QRCode.toDataURL(transactionId, {
      errorCorrectionLevel: 'H',
      width: 120,
      margin: 1,
    });

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>بيان قيد فردي مدني</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Amiri', Arial, sans-serif; 
            background: white; 
            color: #1a1a1a; 
            line-height: 1.45; 
            font-size: 12.5px;
          }
          .header { 
            text-align: center; 
            margin-bottom: 14px; 
            padding-bottom: 10px; 
            border-bottom: 3px solid #0b3d2e; 
          }
          .emblem { height: 72px; margin-bottom: 8px; }
          h1 { font-size: 17px; color: #0b3d2e; margin: 4px 0; font-weight: 700; }
          h2 { font-size: 13px; color: #333; margin: 2px 0; }
          h3 { font-size: 15px; color: #0b3d2e; margin: 10px 0 8px 0; font-weight: 700; }

          .content { 
            display: grid; 
            grid-template-columns: 1fr 150px; 
            gap: 14px; 
            margin-top: 14px; 
          }
          .main-content { grid-column: 1; }
          .sidebar { 
            grid-column: 2; 
            border: 2px solid #444; 
            padding: 10px; 
            background: #f9f5eb; 
            text-align: center; 
            height: fit-content; 
          }
          .photo-box { 
            width: 100%; 
            aspect-ratio: 3/4; 
            border: 2px solid #555; 
            background: #f0f0f0; 
            margin-bottom: 10px; 
            overflow: hidden; 
          }
          .photo-box img { width: 100%; height: 100%; object-fit: cover; }

          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 14px; 
          }
          th, td { 
            border: 1px solid #555; 
            padding: 7px 8px; 
            text-align: right; 
          }
          th { 
            background: #e8dcc8; 
            font-weight: 700; 
            width: 38%; 
          }

          .signatures {
            margin-top: 32px;
            display: flex;
            justify-content: space-between;
            align-items: flex-end;
            gap: 16px;
          }
          .signature-box {
            flex: 1;
            text-align: center;
            border-top: 1px solid #333;
            padding-top: 6px;
            font-size: 12.5px;
          }
          .stamp {
            width: 100px;
            height: 100px;
            border: 3px double #8B0000;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 8px;
            color: #8B0000;
            font-weight: bold;
            font-size: 12px;
            transform: rotate(-8deg);
          }

          .footer { 
            margin-top: 26px; 
            text-align: center; 
            font-size: 12px; 
            color: #444; 
            border-top: 1px solid #999; 
            padding-top: 8px; 
          }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${emblemUrl}" class="emblem" alt="شعار"/>
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
              ${photoUrl ? `<img src="${photoUrl}" alt="صورة شخصية" />` : '<span>لا توجد صورة</span>'}
            </div>
            
            <div style="margin: 15px 0 8px;">
              <img src="${qrCodeDataUrl}" alt="QR Code" style="border: 2px solid #444;"/>
            </div>
            <div style="font-size: 13px; font-weight: bold; color: #0b3d2e;">
              ${transactionId}
            </div>
          </div>
        </div>

        <!-- منطقة التوقيعات -->
        <div class="signatures" style="margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div class="signature-box">
            توقيع صاحب العلاقة<br>
            <span style="font-size: 12px; color: #555;">${user.firstName} ${user.nisba || ''}</span>
          </div>
          <div class="signature-box"  style="margin-top: 20px;">
            <div class="stamp">خاتم<br>السجل المدني</div>
          </div>
          <div class="signature-box" >
            توقيع الموظف المختص<br>
            <span style="font-size: 12px; color: #555;">....................</span>
          </div>
        </div>

        <div class="footer">
          بيان صادر عن النظام الإلكتروني للشؤون المدنية<br>
          تاريخ الإصدار: ${new Date().toLocaleDateString('ar-SY')} | صالح لغاية: ${new Date(Date.now() + 90*24*60*60*1000).toLocaleDateString('ar-SY')}
        </div>
      </body>
      </html>`;

    const pdf = await generatePDF(html, `بيان_فردي_${user.nationalId}`, false);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="individual-record-${user.nationalId}.pdf"`);
    return res.send(pdf.buffer);

  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: 'فشل في توليد البيان الفردي' });
  }
};
// ====================== 3. بيان زواج ======================
export const generateMarriageCertificate = async (req: Request, res: Response) => {
  try {
    const currentUserId = req.user?.userId;
    if (!currentUserId) return res.status(401).json({ success: false, message: 'غير مصرح' });
    const transactionId = `NFS-MARRIAGE-${Date.now()}-${Math.floor(Math.random() * 100000)}`;

    const currentUser = await prisma.user.findUnique({ where: { id: currentUserId } });
    if (!currentUser) return res.status(404).json({ success: false, message: 'المستخدم غير موجود' });
    if (currentUser.maritalStatus !== 'MARRIED') {
      return res.status(400).json({ success: false, message: 'المستخدم غير متزوج ولا يمكن استخراج بيان زواج' });
    }
    const marriage = await prisma.marriageInfo.findFirst({
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

    if (!marriage) return res.status(400).json({ success: false, message: 'لا يوجد سجل زواج مرتبط بهذا الحساب' });

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
    const qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
      errorCorrectionLevel: 'H',
      width: 220,
      margin: 1,
    });

    const emblemUrl = getAbsoluteUrl(req, EMBLEM_PATH);
    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>بيان زواج</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { font-family: 'Amiri', Arial, sans-serif; padding: 22px; background: white; color: #1a1a1a; min-height: 100vh; font-size: 12.5px; line-height: 1.45; }
          .header { 
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            gap: 15px;
            margin-bottom: 12px; 
            padding-bottom: 8px; 
            border-bottom: 2px solid #0b3d2e; 
          }
          .header-content {
            flex: 1;
            text-align: center;
          }
          .header-qr { 
            border: 1px solid #0b3d2e;
            background: #f9f5eb;
            padding: 8px;
            text-align: center;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            gap: 5px;
            flex-shrink: 0;
            width: 110px;
          }
          .header-qr img { width: 88px; height: 88px; border: 1px solid #444; }
          .emblem { height: 68px; margin-bottom: 6px; }
          h1 { font-size: 16px; color: #0b3d2e; margin: 4px 0; font-weight: 700; }
          h2 { font-size: 13px; color: #333; margin: 2px 0; font-weight: 600; }
          h3 { font-size: 15px; color: #0b3d2e; margin: 4px 0; font-weight: 700; }
          .section-title { background: #0b3d2e; color: white; padding: 7px 10px; margin: 10px 0 8px 0; text-align: center; font-size: 14px; font-weight: 700; }
          table { width: 100%; border-collapse: collapse; border-spacing: 0; margin-bottom: 10px; border: 1px solid #444; }
          th, td { border: 1px solid #444; padding: 7px 8px; text-align: right; vertical-align: middle; line-height: 1.35; font-size: 12.5px; }
          th { background: #e8dcc8; font-weight: 700; }
          .footer { margin-top: 18px; padding-top: 14px; text-align: center; border-top: 1px solid #999; font-size: 12px; color: #555; line-height: 1.4; }
          .signatures { margin-top: 16px; display: flex; justify-content: space-between; align-items: flex-end; gap: 12px; font-size: 12px; font-weight: 600; }
          .signature-box { flex: 1; border-top: 1px solid #333; padding-top: 6px; text-align: center; }
          .stamp {
            width: 95px;
            height: 95px;
            border: 3px double #8B0000;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 8px;
            color: #8B0000;
            font-weight: bold;
            font-size: 12px;
            transform: rotate(-8deg);
          }
            .qr-id {
            font-size: 8px;
            font-weight: bold;
            color: #0b3d2e;
            direction: ltr;
            word-break: break-all;
            line-height: 1.2;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-content">
            <img src="${emblemUrl}" class="emblem" alt="شعار"/>
            <h1>الجمهورية العربية السورية</h1>
            <h2>وزارة الداخلية - السجل المدني</h2>
            <h3>بيان زواج</h3>
          </div>
          <div class="header-qr">
            <img src="${qrCodeDataUrl}" alt="QR Code" />
            <div class="qr-id">${transactionId}</div>
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

        <div class="section-title" style="margin-top: 20px;">بيانات عقد الزواج</div>
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

    const pdf = await generatePDF(html, `بيان_زواج_${currentUser.nationalId}`, true);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="marriage-certificate-${currentUser.nationalId}.pdf"`);
    return res.send(pdf.buffer);
  } catch (error: any) {
    console.error('Generate Marriage Certificate Error:', error);
    return res.status(500).json({ success: false, message: 'فشل في توليد بيان الزواج', error: error.message });
  }
};
// ====================== 4.تقرير وفاة ======================
export const generateDeathReport = async (req: Request, res: Response) => {
  try {
    const requesterId = req.user?.userId;
    const targetUserId = Number(req.query.userId || requesterId);

    if (!requesterId || isNaN(targetUserId)) {
      return res.status(400).json({ success: false, message: 'بيانات الطلب غير صحيحة' });
    }

    const requester = await prisma.user.findUnique({ where: { id: requesterId } });
    if (!requester) return res.status(404).json({ success: false, message: 'مقدم الطلب غير موجود' });

    const deceased = await prisma.user.findUnique({ where: { id: targetUserId } });
    if (!deceased) return res.status(404).json({ success: false, message: 'الشخص المتوفى غير موجود' });

    // التحقق من وجود طلب وفاة معتمد
    const deathRequest = await prisma.deathRequest.findFirst({
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
    const emblemUrl = getAbsoluteUrl(req, EMBLEM_PATH);
    const photoUrl = deceased.personalPhoto ? getAbsoluteUrl(req, deceased.personalPhoto) : null;

    const qrCodeDataUrl = await QRCode.toDataURL(transactionId, {
      errorCorrectionLevel: 'H',
      width: 120,
      margin: 1,
    });

    const html = `
      <!DOCTYPE html>
      <html dir="rtl" lang="ar">
      <head>
        <meta charset="utf-8">
        <title>تقرير وفاة</title>
        <style>
          @page { size: A4 portrait; margin: 12mm; }
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: 'Amiri', Arial, sans-serif; 
            background: white; 
            color: #1a1a1a; 
            line-height: 1.45; 
            font-size: 12.5px;
          }
          .header { text-align: center; margin-bottom: 14px; padding-bottom: 10px; border-bottom: 3px solid #8B0000; }
          .emblem { height: 72px; margin-bottom: 8px; }
          h1 { font-size: 17px; color: #8B0000; margin: 5px 0; font-weight: 700; }
          h3 { font-size: 15px; color: #8B0000; margin: 12px 0 8px 0; font-weight: 700; }

          .content { display: grid; grid-template-columns: 1fr 150px; gap: 14px; margin-top: 14px; }
          .main-content { grid-column: 1; }
          .sidebar { grid-column: 2; border: 2px solid #8B0000; padding: 10px; background: #fdf2f2; text-align: center; height: fit-content; }
          .photo-box { width: 100%; aspect-ratio: 3/4; border: 2px solid #8B0000; background: #f0f0f0; margin-bottom: 10px; overflow: hidden; }
          .photo-box img { width: 100%; height: 100%; object-fit: cover; }

          table { width: 100%; border-collapse: collapse; margin-bottom: 14px; }
          th, td { border: 1px solid #555; padding: 7px 8px; text-align: right; }
          th { background: #f0d9d9; font-weight: 700; width: 36%; }

          .signatures { margin-top: 32px; display: flex; justify-content: space-between; align-items: flex-end; gap: 16px; }
          .signature-box { flex: 1; text-align: center; border-top: 1px solid #333; padding-top: 8px; font-size: 12.5px; }
          .stamp { 
            width: 100px; height: 100px; border: 3px double #8B0000; border-radius: 50%; 
            display: flex; align-items: center; justify-content: center; margin: 0 auto 8px;
            color: #8B0000; font-weight: bold; font-size: 12px; transform: rotate(-8deg);
          }

          .footer { margin-top: 26px; text-align: center; font-size: 12px; color: #444; border-top: 1px solid #999; padding-top: 8px; }
        </style>
      </head>
      <body>
        <div class="header">
          <img src="${emblemUrl}" class="emblem" alt="شعار"/>
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

            <h3 style="margin: 25px 0 10px; color: #8B0000;">بيانات الوفاة</h3>
            <table>
              <tr><th>تاريخ الوفاة</th><td>${deathRequest.deathDate ? deathRequest.deathDate.toISOString().split('T')[0] : formatDate(deathRequest.checkedAt)}</td></tr>
              <tr><th>مكان الوفاة</th><td>${deathRequest.deathPlace || '—'}</td></tr>
            </table>
          </div>

          <div class="sidebar">
            <div class="photo-box">
              ${photoUrl ? `<img src="${photoUrl}" alt="صورة" />` : '<span>لا توجد صورة</span>'}
            </div>
            <div style="margin: 15px 0 8px;">
              <img src="${qrCodeDataUrl}" alt="QR"/>
            </div>
            <div style="font-size: 13px; font-weight: bold; color: #8B0000;">${transactionId}</div>
          </div>
        </div>

        <div class="signatures" style="margin-top: 45px;">
          <div class="signature-box">توقيع صاحب العلاقة<br><span style="color:#555;">${requester.firstName} ${requester.nisba || ''}</span></div>
          <div class="signature-box"><div class="stamp" style="margin-top: 45px;">خاتم<br>السجل المدني</div></div>
          <div class="signature-box">توقيع الموظف المختص<br><span style="color:#555;">....................</span></div>
        </div>

        <div class="footer">
          بيان صادر عن النظام الإلكتروني للشؤون المدنية<br>
          تاريخ الإصدار: ${new Date().toLocaleDateString('ar-SY')} | صالح لغاية: ${new Date(Date.now() + 90*24*60*60*1000).toLocaleDateString('ar-SY')}
        </div>
      </body>
      </html>`;

    const pdf = await generatePDF(html, `تقرير_وفاة_${deceased.nationalId}`, false);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="death-report-${deceased.nationalId}.pdf"`);
    return res.send(pdf.buffer);

  } catch (error: any) {
    console.error(error);
    res.status(500).json({ success: false, message: 'فشل في توليد تقرير الوفاة' });
  }
};


