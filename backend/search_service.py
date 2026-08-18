import os
import json
import re
from typing import List, Dict, Any

class SearchService:
    def __init__(self, candidates_file_path: str):
        self.candidates_file_path = candidates_file_path
        self.load_local_candidates()

    def load_local_candidates(self):
        try:
            with open(self.candidates_file_path, "r") as f:
                self.local_candidates = json.load(f)
        except Exception as e:
            print(f"Error loading candidates file: {e}")
            self.local_candidates = []

    def local_search(self, job_description: str) -> List[Dict[str, Any]]:
        """
        Calculates match scores for local candidates based on the job description.
        Matches keywords and skills and ranks candidates.
        """
        if not job_description:
            return [{**cand, "match_score": 100} for cand in self.local_candidates]

        # Extract words from JD for keyword matching
        jd_words = set(re.findall(r'\b[a-zA-Z0-9_+-.#]+\b', job_description.lower()))
        
        results = []
        for candidate in self.local_candidates:
            score = 0
            matched_skills = []
            
            # 1. Match skills (heavy weight)
            for skill in candidate.get("skills", []):
                if skill.lower() in jd_words:
                    score += 15
                    matched_skills.append(skill)
                elif any(word in skill.lower() for word in jd_words if len(word) > 3):
                    # Partial match
                    score += 5
                    matched_skills.append(skill)
            
            # 2. Match job title
            title = candidate.get("job_title", "").lower()
            title_words = set(re.findall(r'\b\w+\b', title))
            title_matches = title_words.intersection(jd_words)
            score += len(title_matches) * 10
            
            # 3. Match general summary keywords
            summary = candidate.get("summary", "").lower()
            summary_words = set(re.findall(r'\b\w+\b', summary))
            summary_matches = summary_words.intersection(jd_words)
            # Filter out short/common words
            meaningful_matches = [w for w in summary_matches if len(w) > 3]
            score += len(meaningful_matches) * 2

            # Calculate normalized match percentage (cap at 98% for realistic feel, minimum 10% if some matches exist)
            max_potential_score = 100
            match_percentage = min(98, max(5, int((score / max_potential_score) * 100))) if score > 0 else 5
            
            results.append({
                **candidate,
                "match_score": match_percentage,
                "matched_skills": matched_skills
            })
            
        # Sort by match score descending
        return sorted(results, key=lambda x: x["match_score"], reverse=True)

    def apollo_search(self, job_description: str, api_key: str) -> Dict[str, Any]:
        """
        Integrates with Apollo.io Search API.
        """
        import requests
        url = "https://api.apollo.io/v1/mixed_people/search"
        
        # Parse titles/skills from JD to use in Apollo search filters
        keywords = self._extract_search_keywords(job_description)
        
        payload = {
            "api_key": api_key,
            "q_keywords": ", ".join(keywords[:5]),
            "page": 1,
            "per_page": 10
        }
        headers = {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache"
        }
        
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            if response.status_code == 200:
                data = response.json()
                # Parse Apollo results format to our standardized schema
                candidates = []
                for idx, person in enumerate(data.get("people", [])):
                    candidates.append({
                        "id": f"apollo_{person.get('id', idx)}",
                        "name": f"{person.get('first_name', '')} {person.get('last_name', '')}".strip(),
                        "email": person.get("email", "n/a"),
                        "mobile_number": person.get("phone_numbers", [{}])[0].get("raw_number", "+919999999999") if person.get("phone_numbers") else "+919999999999",
                        "job_title": person.get("title", "Software Engineer"),
                        "current_company": person.get("organization", {}).get("name", "N/A"),
                        "experience_years": 4, # Apollo doesn't return exact total experience easily, default
                        "skills": keywords[:6],
                        "summary": person.get("headline", "Professional Candidate found via Apollo.io"),
                        "location": person.get("city", "Remote"),
                        "notice_period": "30 days",
                        "current_ctc": "N/A",
                        "expected_ctc": "N/A",
                        "match_score": 85 - idx # Mock score based on order
                    })
                return {"success": True, "results": candidates, "source": "Apollo.io API"}
            else:
                return {"success": False, "error": f"Apollo API Error: {response.status_code} - {response.text}"}
        except Exception as e:
            return {"success": False, "error": f"Apollo Connection Failed: {str(e)}"}

    def proxycurl_search(self, job_description: str, api_key: str) -> Dict[str, Any]:
        """
        Integrates with Proxycurl Search API.
        """
        import requests
        # Proxycurl person search endpoint
        url = "https://nubela.co/proxycurl/api/search/person/"
        
        headers = {"Authorization": f"Bearer {api_key}"}
        keywords = self._extract_search_keywords(job_description)
        role = keywords[0] if keywords else "Software Engineer"
        
        params = {
            "country": "IN",
            "current_role": role,
            "page_size": "10"
        }
        
        try:
            response = requests.get(url, headers=headers, params=params, timeout=10)
            if response.status_code == 200:
                data = response.json()
                candidates = []
                for idx, result in enumerate(data.get("results", [])):
                    profile = result.get("profile", {})
                    candidates.append({
                        "id": f"proxycurl_{idx}",
                        "name": profile.get("full_name", "LinkedIn Candidate"),
                        "email": "contact@proxycurl.com", # Proxycurl fetches contact info separately
                        "mobile_number": "+919999999999",
                        "job_title": profile.get("occupation", role),
                        "current_company": "N/A",
                        "experience_years": 3,
                        "skills": keywords[:5],
                        "summary": profile.get("summary", "LinkedIn profile found via Proxycurl"),
                        "location": profile.get("country_full_name", "India"),
                        "notice_period": "30 days",
                        "current_ctc": "N/A",
                        "expected_ctc": "N/A",
                        "match_score": 88 - idx
                    })
                return {"success": True, "results": candidates, "source": "Proxycurl API"}
            else:
                return {"success": False, "error": f"Proxycurl API Error: {response.status_code} - {response.text}"}
        except Exception as e:
            return {"success": False, "error": f"Proxycurl Connection Failed: {str(e)}"}

    def pdl_search(self, job_description: str, api_key: str) -> Dict[str, Any]:
        """
        Integrates with People Data Labs (PDL) Search API.
        """
        import requests
        url = "https://api.peopledatalabs.com/v5/person/search"
        
        keywords = self._extract_search_keywords(job_description)
        role = keywords[0] if keywords else "Software Engineer"
        
        # Build Elasticsearch DSL query for PDL
        sql_query = f"SELECT * FROM person WHERE job_title='{role}' AND location_country='india' LIMIT 10"
        
        headers = {
            "Content-Type": "application/json",
            "X-Api-Key": api_key
        }
        payload = {
            "sql": sql_query
        }
        
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            if response.status_code == 200:
                data = response.json()
                candidates = []
                for idx, record in enumerate(data.get("data", [])):
                    emails = record.get("emails", [])
                    phones = record.get("phone_numbers", [])
                    candidates.append({
                        "id": f"pdl_{record.get('id', idx)}",
                        "name": record.get("full_name", "PDL Candidate"),
                        "email": emails[0].get("address") if emails else "n/a",
                        "mobile_number": phones[0] if phones else "+919999999999",
                        "job_title": record.get("job_title", role),
                        "current_company": record.get("job_company_name", "N/A"),
                        "experience_years": record.get("experience", [{}])[0].get("duration_years", 3) if record.get("experience") else 3,
                        "skills": record.get("skills", [])[:6],
                        "summary": record.get("job_summary", "Professional profile found via PDL"),
                        "location": record.get("location_locality", "India"),
                        "notice_period": "30 days",
                        "current_ctc": "N/A",
                        "expected_ctc": "N/A",
                        "match_score": 90 - idx
                    })
                return {"success": True, "results": candidates, "source": "People Data Labs API"}
            else:
                return {"success": False, "error": f"PDL API Error: {response.status_code} - {response.text}"}
        except Exception as e:
            return {"success": False, "error": f"PDL Connection Failed: {str(e)}"}

    def coresignal_search(self, job_description: str, api_key: str) -> Dict[str, Any]:
        """
        Integrates with Coresignal LinkedIn member search API.
        """
        import requests
        url = "https://api.coresignal.com/cdapi/v1/linkedin/member/search"
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        keywords = self._extract_search_keywords(job_description)
        role = keywords[0] if keywords else "Software Engineer"
        
        payload = {
            "title": role,
            "limit": 10
        }
        
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            if response.status_code == 200:
                data = response.json()
                candidates = []
                # Coresignal returns list of profiles
                for idx, record in enumerate(data):
                    candidates.append({
                        "id": f"coresignal_{record.get('id', idx)}",
                        "name": record.get("name", "Coresignal Candidate"),
                        "email": record.get("email", "n/a"),
                        "mobile_number": "+919999999999",
                        "job_title": record.get("title", role),
                        "current_company": record.get("company_name", "N/A"),
                        "experience_years": 4,
                        "skills": keywords[:6],
                        "summary": record.get("summary", "LinkedIn member profile from Coresignal"),
                        "location": record.get("location", "India"),
                        "notice_period": "30 days",
                        "current_ctc": "N/A",
                        "expected_ctc": "N/A",
                        "match_score": 87 - idx
                    })
                return {"success": True, "results": candidates, "source": "Coresignal API"}
            else:
                return {"success": False, "error": f"Coresignal API Error: {response.status_code} - {response.text}"}
        except Exception as e:
            return {"success": False, "error": f"Coresignal Connection Failed: {str(e)}"}

    def _extract_search_keywords(self, text: str) -> List[str]:
        """
        Extracts key job titles and skills from job description text.
        """
        # Standard software job keywords mapping
        keywords_pool = ["python", "fastapi", "django", "react", "next.js", "typescript", "javascript", 
                         "pytorch", "tensorflow", "ml", "machine learning", "nlp", "llm", "sales", 
                         "b2b", "marketing", "hr", "kubernetes", "docker", "aws", "sql", "postgresql"]
        text_lower = text.lower()
        found = []
        for kw in keywords_pool:
            if kw in text_lower:
                found.append(kw)
        
        # Add common roles
        roles_pool = ["backend engineer", "frontend engineer", "software engineer", 
                      "machine learning engineer", "data scientist", "business development executive"]
        for role in roles_pool:
            if role in text_lower:
                found.insert(0, role) # Put role at front
                
        if not found:
            # Fallback to single words of length > 4
            found = [w for w in re.findall(r'\b\w+\b', text_lower) if len(w) > 4][:5]
            
        return list(dict.fromkeys(found)) # Remove duplicates
