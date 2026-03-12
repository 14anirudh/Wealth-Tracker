import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const logsDir = path.resolve(__dirname, '../logs');
const logFilePath = path.join(logsDir, 'chat.log');

const ensureLogsDir = async () => {
  await fs.promises.mkdir(logsDir, { recursive: true });
};

const safeSerialize = (value) => {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
    };
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    return {
      serializationError: error.message,
      value: String(value),
    };
  }
};

export const logChatStep = async (step, details = {}) => {
  try {
    await ensureLogsDir();
    const entry = {
      timestamp: new Date().toISOString(),
      step,
      details: safeSerialize(details),
    };

    await fs.promises.appendFile(logFilePath, `${JSON.stringify(entry)}\n`, 'utf8');
  } catch (error) {
    console.error('Failed to write chat log:', error.message);
  }
};

export const getChatLogFilePath = () => logFilePath;
