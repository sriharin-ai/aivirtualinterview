import asyncHandler from 'express-async-handler';
import bcrypt from 'bcryptjs';
import Organization from '../models/OrganizationModel.js';
import User from '../models/User.js';
import Session from '../models/SessionModel.js';

const getOrganizations = asyncHandler(async (req, res) => {
    const orgs = await Organization.find().sort({ createdAt: -1 }).select('-adminPassword');

    const orgsWithCounts = await Promise.all(orgs.map(async (org) => {
        const userCount = await User.countDocuments({ orgId: org._id });
        const sessionCount = await Session.countDocuments({ orgId: org._id });
        return { ...org.toObject(), userCount, sessionCount };
    }));

    res.json(orgsWithCounts);
});

const createOrganization = asyncHandler(async (req, res) => {
    const { name, type, country, orgCode, adminUsername, adminPassword, contactEmail, plan, description, maxUsers } = req.body;

    if (!name || !type || !orgCode || !adminUsername || !adminPassword) {
        res.status(400);
        throw new Error('Name, type, org code, admin username and password are required.');
    }

    const codeExists = await Organization.findOne({ orgCode: orgCode.toUpperCase() });
    if (codeExists) { res.status(400); throw new Error('Org code already in use.'); }

    const userExists = await Organization.findOne({ adminUsername });
    if (userExists) { res.status(400); throw new Error('Admin username already taken.'); }

    const org = await Organization.create({
        name, type, country, orgCode, adminUsername, adminPassword,
        contactEmail, plan, description, maxUsers: maxUsers || 100,
    });

    const orgObj = org.toObject();
    delete orgObj.adminPassword;
    res.status(201).json(orgObj);
});

const updateOrganization = asyncHandler(async (req, res) => {
    const org = await Organization.findById(req.params.id);
    if (!org) { res.status(404); throw new Error('Organization not found.'); }

    const { name, type, country, orgCode, adminUsername, adminPassword, contactEmail, plan, isActive, description, maxUsers } = req.body;

    if (orgCode && orgCode.toUpperCase() !== org.orgCode) {
        const exists = await Organization.findOne({ orgCode: orgCode.toUpperCase(), _id: { $ne: org._id } });
        if (exists) { res.status(400); throw new Error('Org code already in use.'); }
    }
    if (adminUsername && adminUsername !== org.adminUsername) {
        const exists = await Organization.findOne({ adminUsername, _id: { $ne: org._id } });
        if (exists) { res.status(400); throw new Error('Admin username already taken.'); }
    }

    if (name)          org.name = name;
    if (type)          org.type = type;
    if (country !== undefined) org.country = country;
    if (orgCode)       org.orgCode = orgCode;
    if (adminUsername) org.adminUsername = adminUsername;
    if (adminPassword) {
        const salt = await bcrypt.genSalt(10);
        org.adminPassword = await bcrypt.hash(adminPassword, salt);
    }
    if (contactEmail !== undefined) org.contactEmail = contactEmail;
    if (plan)          org.plan = plan;
    if (isActive !== undefined) org.isActive = isActive;
    if (description !== undefined) org.description = description;
    if (maxUsers)      org.maxUsers = maxUsers;

    await org.save();

    const orgObj = org.toObject();
    delete orgObj.adminPassword;

    const userCount = await User.countDocuments({ orgId: org._id });
    const sessionCount = await Session.countDocuments({ orgId: org._id });

    res.json({ ...orgObj, userCount, sessionCount });
});

const deleteOrganization = asyncHandler(async (req, res) => {
    const org = await Organization.findById(req.params.id);
    if (!org) { res.status(404); throw new Error('Organization not found.'); }
    await Organization.findByIdAndDelete(req.params.id);
    res.json({ message: 'Organization deleted.', id: req.params.id });
});

export { getOrganizations, createOrganization, updateOrganization, deleteOrganization };
