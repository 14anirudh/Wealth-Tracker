import { getAllocationsByYear, upsertMonthlyAllocation } from '../services/allocationService.js';

const getStatusCode = (error, fallback = 500) => error.statusCode || fallback;

export const getAllocations = async (req, res) => {
  try {
    const result = await getAllocationsByYear(req.userId, req.query.year);
    return res.json(result);
  } catch (error) {
    return res.status(getStatusCode(error)).json({ message: error.message });
  }
};

export const saveMonthlyAllocation = async (req, res) => {
  try {
    const result = await upsertMonthlyAllocation(req.userId, req.params.year, req.params.month, req.body || {});
    return res.status(201).json(result);
  } catch (error) {
    return res.status(getStatusCode(error, 400)).json({ message: error.message });
  }
};

