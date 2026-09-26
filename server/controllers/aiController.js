import User from '../model/User.js';
import Donor from '../model/Donar.js';
import ReqBlood from '../model/Recipient.js';
import Requests from '../model/Request.js';
import Completed from '../model/Completed.js';
import { Ollama } from 'ollama';

const OLLAMA_API_KEY = process.env.OLLAMA_API_KEY;

const ollama = new Ollama({
    host: "https://ollama.com",
    headers: {
        Authorization: `Bearer ${OLLAMA_API_KEY}`,
    },
});

// GET /api/v1/ai/user-context
export const getUserContext = async (req, res) => {
    try {
        const userId = req.user._id;
        const user = req.user;

        let donorData = null;
        if (user.donorId) {
            donorData = await Donor.findOne({ donorId: userId });
        }

        let recipientData = null;
        if (user.recipientId) {
            recipientData = await ReqBlood.findOne({ recipientId: userId });
        }

        const activeRequests = await Requests.find({
            $or: [{ donorId: userId }, { recipientId: userId }]
        }).sort({ createdAt: -1 });

        const completedRequests = await Completed.find({
            $or: [{ donorId: userId }, { recipientId: userId }]
        }).sort({ createdAt: -1 });

        const uid = userId.toString();

        // Fetch all available donors in the platform
        const availableDonorsList = await User.find({ available: true, donorId: { $exists: true } });

        // Fetch all active blood requests (recipients) in the platform
        const activeRecipientsList = await ReqBlood.find({});
        const activeRecipientsWithDetails = await Promise.all(activeRecipientsList.map(async (r) => {
            const u = await User.findOne({ _id: r.recipientId }).select('username bloodType location');
            if (!u) return null;
            return {
                patientName: r.patientsName,
                bloodGroupNeeded: r.bloodType,
                location: r.location,
                bloodUnits: r.bloodUnits,
                hospital: r.hospitalInfo?.trim() || null,
                isCritical: r.isCritical,
                isDonorFound: r.isDonorFinded
            };
        }));
        const activeRecipients = activeRecipientsWithDetails.filter(Boolean);

        const context = {
            availableDonors: availableDonorsList.map(d => ({
                name: d.username,
                bloodType: d.bloodType,
                location: d.location,
                pinCode: d.pinCode,
                donationCount: d.donation,
                weight: d.weight,
                lastDonated: d.lastDonated || null,
                nextDonationDate: d.nextDonationDate || null
            })),
            activeRequests: activeRecipients.map(r => ({
                patientName: r.patientName,
                bloodGroupNeeded: r.bloodGroupNeeded,
                location: r.location,
                units: r.bloodUnits,
                hospital: r.hospital || null,
                isCritical: r.isCritical ? 'Yes' : 'No',
                isDonorFound: r.isDonorFound ? 'Yes' : 'No'
            })),
            profile: {
                name: user.username,
                age: user.age,
                gender: user.gender,
                bloodGroup: user.bloodType,
                location: user.location,
                pinCode: user.pinCode,
                mobile: user.mobile,
                email: user.email,
                donationCount: user.donation,
                isAvailable: user.available,
                weight: user.weight,
                lastDonated: user.lastDonated || null,
                nextDonationDate: user.nextDonationDate || null,
            },
            donorStatus: {
                isRegisteredAsDonor: !!user.donorId,
                donorFormCompleted: !!donorData,
                donorDetails: donorData ? {
                    hasDonatedBefore: donorData.donatePre,
                    lastSixMonthActivity: donorData.lastSixmonthActivity,
                } : null,
                availabilityStatus: user.available ? 'ON (visible to recipients)' : 'OFF (hidden from recipients)',
            },
            recipientStatus: {
                isRegisteredAsRecipient: !!user.recipientId,
                recipientFormCompleted: !!recipientData,
                recipientDetails: recipientData ? {
                    patientName: recipientData.patientsName,
                    patientAge: recipientData.patientsage,
                    bloodGroupNeeded: recipientData.bloodType,
                    location: recipientData.location,
                    bloodUnits: recipientData.bloodUnits,
                    hospital: recipientData.hospitalInfo?.trim() || null,
                    isCritical: recipientData.isCritical,
                    isDonorFound: recipientData.isDonorFinded,
                } : null,
            },
            donorWorkflow: {
                incomingPendingRequests: activeRequests.filter(r => r.donorId.toString() === uid && r.status === 'prepending').length,
                acceptedRequests: activeRequests.filter(r => r.donorId.toString() === uid && r.status === 'accepted').length,
                waitingForConfirmation: activeRequests.filter(r => r.donorId.toString() === uid && r.status === 'pending').length,
                confirmedAwaitingOTP: activeRequests.filter(r => r.donorId.toString() === uid && r.status === 'confirmed').length,
            },
            recipientWorkflow: {
                sentPendingRequests: activeRequests.filter(r => r.recipientId.toString() === uid && r.status === 'prepending').length,
                acceptedByDonor: activeRequests.filter(r => r.recipientId.toString() === uid && r.status === 'accepted').length,
                waitingForDonorConfirm: activeRequests.filter(r => r.recipientId.toString() === uid && r.status === 'pending').length,
                confirmedAwaitingOTP: activeRequests.filter(r => r.recipientId.toString() === uid && r.status === 'confirmed').length,
            },
            completedDonations: completedRequests.filter(r => r.donorId.toString() === uid).length,
            completedReceived: completedRequests.filter(r => r.recipientId.toString() === uid).length,
        };

        res.status(200).json({ context });
    } catch (err) {
        console.error('AI context error:', err);
        res.status(500).json({ message: 'Failed to fetch user context' });
    }
};

// POST /api/v1/ai/chat  — streams Ollama response back to client
export const aiChat = async (req, res) => {
    const { messages, systemPrompt } = req.body;

    if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ message: 'messages array required' });
    }

    try {
        // Set headers for SSE streaming
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        const allMessages = [];
        if (systemPrompt) {
            allMessages.push({ role: 'system', content: systemPrompt });
        }
        allMessages.push(...messages);

        const stream = await ollama.chat({
            model: 'gpt-oss:120b',
            messages: allMessages,
            stream: true,
        });

        for await (const chunk of stream) {
            const content = chunk.message?.content;
            if (content) {
                res.write(`data: ${JSON.stringify({ content })}\n\n`);
            }
        }

        res.write('data: [DONE]\n\n');
        res.end();
    } catch (err) {
        console.error('AI chat error:', err);
        if (!res.headersSent) {
            res.status(500).json({ message: 'AI service error' });
        } else {
            res.write(`data: ${JSON.stringify({ error: 'AI service error' })}\n\n`);
            res.end();
        }
    }
};
