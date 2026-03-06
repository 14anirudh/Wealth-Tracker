import { createReturn, getReturns, getReturnsSummary, updateReturn } from '../services/returnsService.js';

const getStatusCode = (error, fallback = 500) => error.statusCode || fallback;

export const list = async (req, res) => {
  try {
    const result = await getReturns(req.userId, req.query.months);
    return res.json(result);
  } catch (error) {
    return res.status(getStatusCode(error)).json({ message: error.message });
  }
};

export const create = async (req, res) => {
  try {
    const result = await createReturn(req.userId, req.body || {});
    return res.status(201).json(result);
  } catch (error) {
    return res.status(getStatusCode(error, 400)).json({ message: error.message });
  }
};

export const update = async (req, res) => {
  try {
    const result = await updateReturn(req.userId, req.params.id, req.body || {});
    return res.json(result);
  } catch (error) {
    return res.status(getStatusCode(error, 400)).json({ message: error.message });
  }
};

export const summary = async (req, res) => {
  try {
    const result = await getReturnsSummary(req.userId);
    return res.json(result);
  } catch (error) {
    return res.status(getStatusCode(error)).json({ message: error.message });
  }
};

