import ejs from 'ejs';
import puppeteer from 'puppeteer';
import fs from 'node:fs/promises';
import sequelize from '../db/index.js';

const generatePDFAndUploadToS3 = async (results) => {
  const lpuLogo = (await fs.readFile("/media/suyash/HDD/realwork/lpu-bot-prototype/packages/lib/media/raw/full-logo-no-bg.png")).toString("base64");
  const profile = (await fs.readFile("/media/suyash/HDD/realwork/lpu-bot-prototype/packages/lib/media/misc/profile.png")).toString("base64");
  const resultTemplatePath = "/media/suyash/HDD/realwork/lpu-bot-prototype/packages/lib/static/template/result.ejs";
  const pdfData = {
    pageAssets: {
      lpuLogo,
      profile
    }
  };

  const browser = await puppeteer.launch();
  const pageForAllSemesterPDF = await browser.newPage();
  const pageForLastSemesterPDF = await browser.newPage();

  for (let result of results) {
    let registrationNo = result[0][0].registration_no;
    let [ student ] = await sequelize.query(`
      SELECT 
        first_name,
        middle_name,
        last_name,
        course_code,
        father_name,
        mother_name,
        session
      FROM student
      LEFT JOIN course c
        ON c.id = student.course_id
      WHERE registration_no=${registrationNo};
    `);
    student[0].registration_no = registrationNo;

    pdfData["student"] = student[0];
    pdfData["allSemester"] = result;
    pdfData["lastSemester"] = result[result.length - 1];
    
    pdfData.resultType = "all semester";
    const allSemesterPdfHTML = await ejs.renderFile("/media/suyash/HDD/realwork/lpu-bot-prototype/packages/lib/static/template/result.ejs", pdfData);
    await pageForAllSemesterPDF.setContent(allSemesterPdfHTML, { waitUntil: 'domcontentloaded' });
    await pageForAllSemesterPDF.emulateMediaType('screen');

    const allSemesterPdfBuffer = await pageForAllSemesterPDF.pdf({
      // path: `./${registrationNo} All Semesters Result.pdf`,
      printBackground: true,
      format: 'A4'
    });

    
    pdfData.resultType = "last semester";
    const lastSemesterPdfHTML = await ejs.renderFile("/media/suyash/HDD/realwork/lpu-bot-prototype/packages/lib/static/template/result.ejs", pdfData);
    await pageForLastSemesterPDF.setContent(lastSemesterPdfHTML, { waitUntil: 'domcontentloaded' });
    await pageForLastSemesterPDF.emulateMediaType('screen');
    
    const lastSemesterPdfBuffer = await pageForLastSemesterPDF.pdf({
      // path: `./${registrationNo} Last Semester Result.pdf`,
      printBackground: true,
      format: 'A4'
    });

    // console.log(allSemesterPdfBuffer);
  };
    
  await pageForLastSemesterPDF.close();
  await pageForAllSemesterPDF.close();
  browser.close();
};

export default generatePDFAndUploadToS3;