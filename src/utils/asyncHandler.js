//async Handler a wrapper function to deal with asynchronus code

const asyncHandler = (reqHandler) => {
  return (req, res, next) => {
    Promise.resolve(reqHandler(req, res, next)).catch((err) => {
      next(err);
    });
  };
};

//export async Handler Function
export default asyncHandler;
