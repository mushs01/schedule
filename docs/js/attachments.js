// Attachment upload helper for schedules
// Uses Firebase Storage compat (window.storage) and Firestore via api.updateSchedule

window.uploadScheduleAttachments = async function uploadScheduleAttachments(scheduleId) {
    const storage = window.storage;
    const api = window.api;
    if (!storage || !api) {
        console.error('❌ Storage or API not initialized');
        return;
    }
    if (!scheduleId) {
        console.error('❌ Missing scheduleId for attachment upload');
        return;
    }
    if (!Array.isArray(pendingAttachments) || pendingAttachments.length === 0) {
        return;
    }

    try {
        const storageRef = storage.ref();
        const uploaded = [];
        for (const file of pendingAttachments) {
            const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
            const path = `attachments/${scheduleId}/${Date.now()}_${safeName}`;
            const fileRef = storageRef.child(path);
            await fileRef.put(file);
            const url = await fileRef.getDownloadURL();
            uploaded.push({
                name: file.name,
                url,
                type: file.type || 'application/octet-stream',
                size: file.size,
                uploadedAt: new Date().toISOString()
            });
        }

        // 기존 첨부를 보존하면서 추가
        const existing = await api.getSchedule(scheduleId);
        const existingAttachments = existing?.attachments || [];
        const merged = existingAttachments.concat(uploaded);
        await api.updateSchedule(scheduleId, { attachments: merged });
        console.log('✅ Attachments uploaded for schedule', scheduleId, merged);
    } catch (err) {
        console.error('❌ Failed to upload attachments:', err);
        if (window.showToast) {
            window.showToast('첨부 파일 업로드에 실패했습니다.', 'error');
        }
    }
}

