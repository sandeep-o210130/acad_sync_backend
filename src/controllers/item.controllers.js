import { isValidObjectId } from 'mongoose';
import asyncHandler from '../utils/asyncHandler.js';
import { Item } from '../models/item.model.js';
import ApiError from '../utils/ApiError.js';
import ApiResponse from '../utils/ApiResponse.js';
import { uploadOnCloudinary } from '../utils/cloudinary.js';

export const createItem = asyncHandler(async (req, res) => {
	const { title = '', description = '', phoneNo = '', location, category } =
		req.body;

	if ([title, description, phoneNo].some((field) => !field.trim())) {
		throw new ApiError(422, 'Title, description and contact number are required');
	}

	let imageUrl = req.body.imageUrl || '';
	if (req.file?.path) {
		const uploadResult = await uploadOnCloudinary(req.file.path);
		if (!uploadResult) {
			throw new ApiError(400, 'Failed to upload image');
		}
		imageUrl = uploadResult.secure_url || uploadResult.url;
	}

	const item = await Item.create({
		title,
		description,
		location,
		category,
		phoneNo,
		itemImage: imageUrl,
		user: req.user?._id,
	});

	const populatedItem = await Item.findById(item._id).populate(
		'user',
		'name email idNo'
	);

	res
		.status(201)
		.json(new ApiResponse(201, populatedItem, 'New item created successfully'));
});
export const updateItem = asyncHandler(async (req, res) => {
	const { itemId } = req.params;
	if (!itemId) {
		throw new ApiError(400, 'Item id is required');
	}

	const item = await Item.findById(itemId);
	if (!item) {
		throw new ApiError(404, 'Item not found');
	}

	const isOwner = String(item.user) === String(req.user?._id);
	if (!isOwner && req.user?.role !== 'ADMIN') {
		throw new ApiError(403, 'You are not authorised to update this item');
	}

	const updates = {
		title: req.body.title ?? item.title,
		description: req.body.description ?? item.description,
		phoneNo: req.body.phoneNo ?? item.phoneNo,
		location: req.body.location ?? item.location,
		category: req.body.category ?? item.category,
	};

	if (req.body.status) {
		const normalizedStatus = String(req.body.status).toUpperCase();
		if (['OPEN', 'RESOLVED'].includes(normalizedStatus)) {
			updates.status = normalizedStatus;
			updates.resolvedAt =
				normalizedStatus === 'RESOLVED' ? new Date() : null;
		}
	}

	if (req.file?.path) {
		const uploadResult = await uploadOnCloudinary(req.file.path);
		if (!uploadResult) {
			throw new ApiError(400, 'Failed to upload image');
		}
		updates.itemImage = uploadResult.secure_url || uploadResult.url;
	}

	const updatedItem = await Item.findByIdAndUpdate(
		itemId,
		{ $set: updates },
		{ new: true }
	);

	res
		.status(200)
		.json(new ApiResponse(200, updatedItem, 'Item updated successfully'));
});
export const deleteItem = asyncHandler(async (req, res) => {
	const { itemId } = req.params;
	const userId = req.user?._id;

	if (!isValidObjectId(itemId)) {
		throw new ApiError(422, 'Invalid Object id to delete Item');
	}
	const item = await Item.findById(itemId);
	if (!item) {
		throw new ApiError(400, "Can't find them item !");
	}

	const isOwner = String(item.user) === String(userId);
	if (!isOwner && req.user?.role !== 'ADMIN') {
		throw new ApiError(403, 'You are not authorised to delete this item');
	}

	await Item.findByIdAndDelete(itemId);

	res
		.status(200)
		.json(new ApiResponse(200, { success: true }, 'Item deleted successfully'));
});
export const getAllItems = asyncHandler(async (req, res) => {
	const query = {};
	if (req.query.category) {
		query.category = req.query.category;
	}
	if (req.query.search) {
		query.$or = [
			{ title: { $regex: req.query.search, $options: 'i' } },
			{ description: { $regex: req.query.search, $options: 'i' } },
			{ location: { $regex: req.query.search, $options: 'i' } },
		];
	}

	const availableItems = await Item.find(query)
		.sort({ createdAt: -1 })
		.populate('user', 'name email idNo');

	res
		.status(200)
		.json(
			new ApiResponse(200, availableItems, 'Items fetched successfully')
		);
});
