export const withErrorTest = async (callback) => {
  try {
    await callback();
  } catch (err) {
    throw err;
  }
};
