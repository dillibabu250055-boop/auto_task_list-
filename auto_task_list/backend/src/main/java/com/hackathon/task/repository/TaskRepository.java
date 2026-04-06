package com.hackathon.task.repository;

import com.hackathon.task.entity.Task;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface TaskRepository extends JpaRepository<Task, Long> {
    
    @Transactional
    void deleteBySyncedByEmail(String syncedByEmail);

    boolean existsByMessageIdAndSyncedByEmail(String messageId, String syncedByEmail);
}