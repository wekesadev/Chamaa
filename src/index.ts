// Import necessary libraries
import { v4 as uuidv4 } from "uuid";
import { Server, StableBTreeMap, ic, Principal } from "azle";
import express from "express";

// Define the Group class to represent a chamaa group
class Group {
  id: string;
  name: string;
  adminId: string;
  members: string[];
  createdAt: Date;

  constructor(name: string, adminId: string) {
    this.id = uuidv4();
    this.name = name;
    this.adminId = adminId;
    this.members = [];
    this.createdAt = new Date();
  }
}

// Define the Admin class to represent the admin of a group
class Admin {
  id: Principal;
  name: string;
  email: string;
  createdAt: Date;

  constructor(name: string, email: string) {
    this.id = ic.caller();
    this.name = name;
    this.email = email;
    this.createdAt = new Date();
  }
}

// Define the Member class to represent members of a group
class Member {
  id: string;
  name: string;
  email: string;
  createdAt: Date;

  constructor(name: string, email: string) {
    this.id = uuidv4();
    this.name = name;
    this.email = email;
    this.createdAt = new Date();
  }
}

// Define the Contribution class to represent contributions made by members
class Contribution {
  id: string;
  groupId: string;
  memberId: string;
  amount: number;
  createdAt: Date;

  constructor(groupId: string, memberId: string, amount: number) {
    this.id = uuidv4();
    this.groupId = groupId;
    this.memberId = memberId;
    this.amount = amount;
    this.createdAt = new Date();
  }
}

// Initialize stable maps for storing groups, members, and contributions
const groupsStorage = StableBTreeMap<string, Group>(0);
const membersStorage = StableBTreeMap<string, Member>(1);
const contributionsStorage = StableBTreeMap<string, Contribution>(2);

// Initialize stable map for storing admins
const adminsStorage = StableBTreeMap<string, Admin>(3);

// Function to Initialize the admin
function initializeDefaultAdmin() {
  const defaultAdmin = [new Admin("Alice Johnson", "alice@exampple.com")];

  defaultAdmin.forEach((admin) => {
    adminsStorage.insert(admin.id.toString(), admin);
  });
}

// Define the express server
export default Server(() => {
  const app = express();
  app.use(express.json());

  // Initialize the default admin
  initializeDefaultAdmin();

  // Endpoint for retrieving all admins
  app.get("/admins", (req, res) => {
    res.json(adminsStorage.values());
  });

  // Endpoint for creating a new group
  app.post("/groups", (req, res) => {
    // Validate the request body
    if (
      !req.body.name ||
      typeof req.body.name !== "string" ||
      !req.body.adminId
    ) {
      res.status(400).json({
        status: 400,
        message: "Group name and adminId are required",
      });
      return;
    }

    const adminId = req.body.adminId;

    // Check if the provided adminId exists in the storage
    const admin = adminsStorage.get(adminId);
    if ("None" in admin) {
      res.status(404).json({
        status: 404,
        message: "Admin not found with provided adminId",
      });
      return;
    }

    // Attempt to create a new group if adminId is validated
    try {
      const group = new Group(req.body.name, adminId);

      groupsStorage.insert(group.id, group);

      // Send Success response after creating the group
      res.status(201).json({
        status: 201,
        message: "Group created successfully",
        group,
      });
    } catch (error) {
      res.status(500).json({
        status: 500,
        message: "An error occurred while creating the group",
      });
    }
  });

  // Endpoint for retrieving all groups
  app.get("/groups", (req, res) => {
    try {
      const groups = groupsStorage.values();

      // Check if there are no groups in storage
      if (groups.length === 0) {
        res.status(404).json({
          status: "error",
          message: "No groups found.",
        });
        return;
      }

      // Success response with groups
      res.json({
        status: "success",
        message: "Groups retrieved successfully.",
        data: groups,
      });
    } catch (error) {
      console.error("Failed to retrieve groups:", error);

      // Respond with a generic error message
      res.status(500).json({
        status: "error",
        message: "An unexpected error occurred while retrieving groups.",
      });
    }
  });

  // Endpoint for adding a member to a group
  app.post("/groups/:groupId/members/:memberId", (req, res) => {
    const { groupId, memberId } = req.params;

    try {
      // Check if the group and member exist in the respective storages
      const groupOpt = groupsStorage.get(groupId);
      const memberOpt = membersStorage.get(memberId);

      if ("None" in groupOpt || "None" in memberOpt) {
        res.status(404).json({
          status: "error",
          message: "Group or member not found.",
        });
        return;
      }

      const group = groupOpt.Some;

      // Check if the member is already part of the group
      if (group.members.includes(memberId)) {
        res.status(409).json({
          status: "error",
          message: "Member already in group.",
        });
        return;
      }

      // Add member to the group
      group.members.push(memberId);
      groupsStorage.insert(groupId, group);

      // Success response
      res.status(200).json({
        status: "success",
        message: "Member added to the group successfully.",
        group,
      });
    } catch (error) {
      // Log the error for server-side diagnostics
      console.error("Failed to add member to group:", error);

      // Respond with a generic error message to avoid leaking sensitive error details
      res.status(500).json({
        status: "error",
        message: "An unexpected error occurred while processing your request.",
      });
    }
  });

  // Endpoint for creating a new member
  app.post("/members", (req, res) => {
    if (!req.body.name || !req.body.email) {
      res.status(400).send("Name and email are required");
      return;
    }

    // Check if the provided email is unique
    const memberEmails = membersStorage.values().map((member) => member.email);
    if (memberEmails.includes(req.body.email)) {
      res.status(400).json({
        status: "error",
        message: "Email already exists",
      });
      return;
    }

    // Attempt to create a new member
    try {
      const member = new Member(req.body.name, req.body.email);

      membersStorage.insert(member.id, member);

      // Send Success response after creating the member
      res.status(201).json({
        status: "success",
        message: "Member created successfully",
        member,
      });
    } catch (error) {
      res.status(500).json({
        status: 500,
        message: "An error occurred while creating the member",
      });
    }
  });

  // Endpoint for retrieving all members
  app.get("/members", (req, res) => {
    try {
      const members = membersStorage.values();

      // Check if there are no members in storage
      if (members.length === 0) {
        res.status(404).json({
          status: "error",
          message: "No members found.",
        });
        return;
      }

      // Success response with members
      res.json({
        status: "success",
        message: "Members retrieved successfully.",
        data: members,
      });
    } catch (error) {
      console.error("Failed to retrieve members:", error);

      // Respond with a generic error message
      res.status(500).json({
        status: "error",
        message: "An unexpected error occurred while retrieving members.",
      });
    }
  });

  // Endpoint for creating a new contribution
  app.post("/contributions", (req, res) => {
    // Validate the request body
    if (!req.body.groupId || !req.body.memberId || !req.body.amount) {
      res.status(400).json({
        status: 400,
        message: "groupId, memberId, and amount are required",
      });
    }

    // Check if the provided groupId and memberId exist in the storage
    const group = groupsStorage.get(req.body.groupId);
    const member = membersStorage.get(req.body.memberId);

    if ("None" in group || "None" in member) {
      res.status(404).json({
        status: 404,
        message: "Group or member not found with provided id",
      });
      return;
    }

    // Attempt to create a new contribution if groupId and memberId are validated
    try {
      const contribution = new Contribution(
        req.body.groupId,
        req.body.memberId,
        req.body.amount
      );

      contributionsStorage.insert(contribution.id, contribution);

      // Send Success response after creating the contribution
      res.status(201).json({
        status: 201,
        message: "Contribution created successfully",
        contribution,
      });
    } catch (error) {
      res.status(500).json({
        status: 500,
        message: "An error occurred while creating the contribution",
      });
    }
  });

  // Endpoint for retrieving all contributions
  app.get("/groups/:groupId/contributions", (req, res) => {
    const { groupId } = req.params;

    // Check if the provided groupId exists in the groups storage
    const groupOpt = groupsStorage.get(groupId);
    if ("None" in groupOpt) {
      // Group not found, return an error
      res.status(404).json({
        status: "error",
        message: "Group not found with the provided groupId",
      });
      return;
    }

    // Group exists, now retrieve all contributions for this group
    const contributions = contributionsStorage
      .values()
      .filter((contribution) => contribution.groupId === groupId);

    // Check if there are contributions
    if (contributions.length === 0) {
      // No contributions found for the group
      res.status(404).json({
        status: "error",
        message: "No contributions found for the group",
      });
      return;
    }

    // Return the contributions if found
    res.json({
      status: "success",
      message: "Contributions retrieved successfully",
      data: contributions,
    });
  });

  // Start the server
  return app.listen();
});
