'use server';

import { userShares } from './db';

interface UserShareDoc {
  $loki?: number;
  email: string;
  userShare: any;
  createdAt: string;
  updatedAt: string;
}

export async function saveUserShare(email: string, userShare: any) {
  if (!email || !userShare) {
    throw new Error('Email and userShare are required');
  }

  try {
    // Check if document already exists
    const existingDoc = userShares.findOne({ email }) as UserShareDoc | null;

    let doc: UserShareDoc;
    if (existingDoc) {
      // Update existing document
      doc = {
        ...existingDoc,
        email,
        userShare,
        createdAt: existingDoc.createdAt,
        updatedAt: new Date().toISOString()
      };
      userShares.update(doc);
    } else {
      // Create new document
      doc = {
        email,
        userShare,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      userShares.insert(doc);
    }

    return { message: 'Data saved successfully', $loki: doc.$loki };
  } catch (error) {
    console.error('Error saving user share:', error);
    throw new Error('Failed to save data');
  }
}

export async function getUserShare(email: string) {
  if (!email) {
    throw new Error('Email parameter is required');
  }

  try {
    const doc = userShares.findOne({ email }) as UserShareDoc | null;

    if (!doc) {
      throw new Error('No data found for this email');
    }

    return doc;
  } catch (error) {
    console.error('Error getting user share:', error);
    throw new Error('Failed to retrieve data');
  }
}

export async function deleteUserShare(email: string) {
  if (!email) {
    throw new Error('Email parameter is required');
  }

  try {
    const doc = userShares.findOne({ email }) as UserShareDoc | null;

    if (!doc) {
      throw new Error('No data found for this email');
    }

    userShares.remove(doc);
    return { message: 'Data deleted successfully' };
  } catch (error) {
    console.error('Error deleting user share:', error);
    throw new Error('Failed to delete data');
  }
}

export async function getAllUserShares() {
  try {
    const docs = userShares.find();
    return docs as unknown as UserShareDoc[];
  } catch (error) {
    console.error('Error getting all user shares:', error);
    throw new Error('Failed to retrieve data');
  }
} 