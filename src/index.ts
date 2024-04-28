// Import necessary libraries
import { v4 as uuidv4 } from "uuid";
import { Server, StableBTreeMap, ic } from "azle";
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
const contributionsStorage = StableBTreeMap<string, Contribution>(3);

// Define the express server
export default Server(() => {
  const app = express();
  app.use(express.json());

  // Endpoint for creating a new group
  app.post("/groups", (req, res) => {
    const group: Group = {
      id: uuidv4(),
      createdAt: getCurrentDate(),
      members: [],
      ...req.body,
    };
    groupsStorage.insert(group.id, group);
    res.json(group);
  });

  // Endpoint for retrieving all groups
  app.get("/groups", (req, res) => {
    res.json(groupsStorage.values());
  });

  // Endpoint for adding a member to a group
  app.post("/groups/:groupId/members/:memberId", (req, res) => {
    const { groupId, memberId } = req.params;
    const groupOpt = groupsStorage.get(groupId);
    const memberOpt = membersStorage.get(memberId);

    if ("None" in groupOpt || "None" in memberOpt) {
      res.status(404).send("Group or member not found");
    } else {
      const group = groupOpt.Some;
      if (!group.members.includes(memberId)) {
        group.members.push(memberId);
        groupsStorage.insert(groupId, group);
        res.json({ message: "Member added to the group" });
      } else {
        res.status(400).send("Member already in group");
      }
    }
  });

  // Endpoint for creating a new member
  app.post("/members", (req, res) => {
    if (!req.body.name || !req.body.email) {
      res.status(400).send("Name and email are required");
      return;
    }
    const member: Member = {
      id: uuidv4(),
      createdAt: getCurrentDate(),
      ...req.body,
    };
    membersStorage.insert(member.id, member);
    res.json(member);
  });

  // Endpoint for creating a new contribution
  app.post("/contributions", (req, res) => {
    const contribution: Contribution = {
      id: uuidv4(),
      createdAt: getCurrentDate(),
      ...req.body,
    };
    contributionsStorage.insert(contribution.id, contribution);
    res.json(contribution);
  });

  // Endpoint for retrieving all contributions for a group
  app.get("/groups/:groupId/contributions", (req, res) => {
    const { groupId } = req.params;
    const contributions = contributionsStorage
      .values()
      .filter((contribution) => contribution.groupId === groupId);
    res.json(contributions);
  });

  // Start the server
  return app.listen();
});

// Function to get the current date
function getCurrentDate() {
  const timestamp = new Number(ic.time());
  return new Date(timestamp.valueOf() / 1000_000);
}
