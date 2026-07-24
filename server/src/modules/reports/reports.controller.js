const reportsService = require("./reports.service");

async function exportEnrollments(req, res, next) {
  try {
    const { status, startDate, endDate } = req.query;
    const result = await reportsService.exportEnrollments({ status, startDate, endDate });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    return res.send(result.csv);
  } catch (error) { next(error); }
}

async function exportPayments(req, res, next) {
  try {
    const { status, method, startDate, endDate } = req.query;
    const result = await reportsService.exportPayments({ status, method, startDate, endDate });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    return res.send(result.csv);
  } catch (error) { next(error); }
}

async function exportComplaints(req, res, next) {
  try {
    const { status, startDate, endDate } = req.query;
    const result = await reportsService.exportComplaints({ status, startDate, endDate });
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);
    return res.send(result.csv);
  } catch (error) { next(error); }
}

module.exports = { exportEnrollments, exportPayments, exportComplaints };
