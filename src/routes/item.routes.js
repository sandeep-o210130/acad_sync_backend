import {Router} from "express"

import {isLoggedIn} from "../middlewares/auth.middleware.js"
import { upload } from "../middlewares/multer.middleware.js";
import { createItem, deleteItem, getAllItems, updateItem } from "../controllers/item.controllers.js";


const router = Router();


router.use(isLoggedIn);



router
	.route('/')
	.get(getAllItems)
	.post(upload.single('itemImage'), createItem);
router
	.route('/:itemId')
	.patch(upload.single('itemImage'), updateItem)
	.delete(deleteItem);


export default router;