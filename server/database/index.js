const { userManager } = require("./userManager");
const { systemSettingManager } = require("./systemSettingManager");

exports.userManager = userManager;
exports.systemSettingManager = systemSettingManager;
exports.users = require("./schema").users;
exports.systemSettings = require("./schema").systemSettings;
exports.insertUserSchema = require("./schema").insertUserSchema;
exports.updateUserSchema = require("./schema").updateUserSchema;
exports.insertSystemSettingSchema = require("./schema").insertSystemSettingSchema;
exports.updateSystemSettingSchema = require("./schema").updateSystemSettingSchema;
