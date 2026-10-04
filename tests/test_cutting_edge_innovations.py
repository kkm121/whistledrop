"""Tests for cutting-edge WhistleDrop innovations:
1. Adversarial Stylometry Obfuscator (ALISON / SALA inspired)
2. Plausible Deniability Honey Encryption Decoy Vault
3. Zero-Knowledge Domain Credential Verifier (ZK-Email / Semaphore inspired)
"""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.ml.stylometry import StylometricObfuscator
from app.ml.honey import HoneyVault
from app.ml.zk_credential import ZKCredentialVerifier

client = TestClient(app)


def test_stylometry_analyzer_identifies_linguistic_fingerprints():
    text = (
        "Furthermore, whilst contemplating the aforementioned systemic vulnerabilities, "
        "one must undeniably acknowledge the catastrophic ramifications; hence, we urgently "
        "beseech immediate, decisive intervention from higher authorities!"
    )
    analysis = StylometricObfuscator.analyze(text)
    assert "risk_score" in analysis
    assert "lexical_diversity" in analysis
    assert "avg_sentence_length" in analysis
    assert "readability_grade" in analysis
    assert analysis["risk_score"] > 0.4  # High idiosyncratic formal stylometry detected


def test_stylometry_obfuscator_neutralizes_text_and_lowers_attribution_risk():
    idiosyncratic_text = (
        "Whilst inspecting the cluster, I've observed that we're definitely compromised. "
        "Furthermore, one cannot overlook the director's blatant culpability; "
        "hence, catastrophic data leakage is exceedingly imminent!"
    )
    result = StylometricObfuscator.obfuscate(idiosyncratic_text)
    assert "obfuscated_text" in result
    assert "original_risk_score" in result
    assert "obfuscated_risk_score" in result
    assert result["obfuscated_risk_score"] < result["original_risk_score"]
    # Check that British / rare terms like 'whilst' are normalized
    assert "whilst" not in result["obfuscated_text"].lower()


def test_honey_vault_generates_plausible_decoy_report():
    decoy = HoneyVault.generate_decoy(category="technical")
    assert "code" in decoy
    assert "category" in decoy
    assert "description" in decoy
    assert "status" in decoy
    assert decoy["is_decoy"] is True
    assert any(
        kw in decoy["description"].lower()
        for kw in ["facility", "temperature", "calibration", "maintenance", "inventory", "stationery", "audit"]
    )



def test_honey_vault_coercion_resistant_tracking():
    # Calling track with a decoy passcode should return an authentic envelope with harmless decoy data
    decoy_code = "HONEY-DEMO-8842"
    resp = client.get(f"/track/{decoy_code}")
    assert resp.status_code == 200
    data = resp.json()
    assert "status" in data
    assert "description" in data
    assert data["category"] in ["technical", "other"]


def test_zk_credential_verification_valid_signature():
    # Issue a mock corporate ZK domain proof for @defense.gov
    proof_payload = ZKCredentialVerifier.create_mock_zk_proof(
        domain="defense.gov",
        secret_nullifier="whistleblower-leaf-007"
    )
    result = ZKCredentialVerifier.verify_proof(proof_payload)
    assert result["is_valid"] is True
    assert result["domain"] == "defense.gov"
    assert "nullifier_hash" in result
    # Identity is never revealed
    assert "secret_nullifier" not in result


def test_zk_credential_verification_tampered_proof_rejected():
    proof_payload = ZKCredentialVerifier.create_mock_zk_proof(
        domain="defense.gov",
        secret_nullifier="whistleblower-leaf-007"
    )
    proof_payload["proof_hash"] = "tampered_fake_hash_value"
    result = ZKCredentialVerifier.verify_proof(proof_payload)
    assert result["is_valid"] is False


def test_public_api_stylometry_endpoints():
    resp = client.post(
        "/suggest/stylometry/analyze",
        json={"text": "Whilst examining the cluster, we've encountered massive anomalies."}
    )
    assert resp.status_code == 200
    data = resp.json()
    assert "risk_score" in data

    resp_obf = client.post(
        "/suggest/stylometry/obfuscate",
        json={"text": "Whilst examining the cluster, we've encountered massive anomalies."}
    )
    assert resp_obf.status_code == 200
    data_obf = resp_obf.json()
    assert "obfuscated_text" in data_obf
    assert data_obf["obfuscated_risk_score"] <= data_obf["original_risk_score"]
