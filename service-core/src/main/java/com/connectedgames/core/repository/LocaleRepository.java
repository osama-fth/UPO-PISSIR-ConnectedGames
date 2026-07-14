package com.connectedgames.core.repository;

import com.connectedgames.core.entity.Locale;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface LocaleRepository extends JpaRepository<Locale, String> {
}
