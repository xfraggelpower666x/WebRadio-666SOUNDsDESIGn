import json
import tempfile
import unittest
from pathlib import Path
import importlib.util
import sys

MODULE = Path(__file__).resolve().parents[1] / "codeforge_radio_agent.py"
spec = importlib.util.spec_from_file_location("codeforge_radio_agent", MODULE)
mod = importlib.util.module_from_spec(spec); sys.modules[spec.name] = mod; spec.loader.exec_module(mod)

class RadioAgentTests(unittest.TestCase):
    def make_repo(self, root):
        root=Path(root); (root/"public").mkdir(); (root/".github/workflows").mkdir(parents=True)
        (root/"worker.js").write_text("export default {fetch(){return new Response('/stream')}}")
        (root/"public/index.html").write_text("<audio></audio>")
        (root/"package.json").write_text('{"scripts":{"verify":"npm test"}}')
        return root

    def test_audit_is_read_only_and_radio_specialized(self):
        with tempfile.TemporaryDirectory() as tmp:
            agent=mod.RadioRepositoryCodingAgent(self.make_repo(tmp)); result=agent.scan()
            self.assertEqual(result["status"],"PASS"); self.assertFalse(result["mutation_performed"])
            self.assertIn("worker.js",result["architecture"]["workers"]); self.assertGreater(result["protected_file_count"],0)

    def test_proposal_never_executes(self):
        with tempfile.TemporaryDirectory() as tmp:
            agent=mod.RadioRepositoryCodingAgent(self.make_repo(tmp)); audit=agent.scan()
            proposal=agent.build_proposal(audit,[{"path":"worker.js","operation":"UPDATE"}])
            self.assertFalse(proposal["execution_enabled"]); self.assertEqual(proposal["operations"][0]["execution_status"],"WRITE_BLOCKED")

    def test_interruption_integrate_reaudit_resume(self):
        with tempfile.TemporaryDirectory() as tmp:
            manager=mod.ContinuationManager(Path(tmp)); manager.set_task({"id":"radio"}); manager.checkpoint("P",1,1,{"ok":True})
            manager.interrupt("new architecture requirement")
            with self.assertRaises(RuntimeError): manager.resume()
            receipt=manager.integrate(); self.assertEqual(receipt["status"],"PASS")
            self.assertEqual(manager.resume()["status"],"RESUMED")

    def test_secret_signal_blocks_audit(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=self.make_repo(tmp); (root/"bad.txt").write_text("-----BEGIN PRIVATE KEY-----")
            result=mod.RadioRepositoryCodingAgent(root).scan(); self.assertEqual(result["status"],"BLOCKED")
            self.assertEqual(result["secret_signals"][0]["value"],"REDACTED")

    def test_secret_patterns_detect_github_and_cloudflare_tokens(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=self.make_repo(tmp)
            (root/"tokens.txt").write_text(
                "ghp_abcdefghijklmnopqrstuvwxyz123456\n"
                "CLOUDFLARE_API_TOKEN=abcdefghijklmnop1234567890"
            )
            result=mod.RadioRepositoryCodingAgent(root).scan()
            self.assertEqual(result["status"],"BLOCKED")
            patterns={signal["pattern"] for signal in result["secret_signals"]}
            self.assertIn("github_token",patterns)
            self.assertIn("cloudflare_token",patterns)

    def test_path_escape_is_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            agent=mod.RadioRepositoryCodingAgent(self.make_repo(tmp)); audit=agent.scan()
            with self.assertRaises(ValueError):
                agent.build_proposal(audit,[{"path":"safe/../../worker.js","operation":"UPDATE"}])

    def test_resume_rejects_tampered_checkpoint_and_task(self):
        with tempfile.TemporaryDirectory() as tmp:
            manager=mod.ContinuationManager(Path(tmp)); manager.set_task({"id":"radio"})
            manager.checkpoint("P",1,1,{"ok":True})
            state=json.loads(manager.state_path.read_text())
            state["last_checkpoint"]["payload"]["ok"]=False
            manager.state_path.write_text(json.dumps(state))
            with self.assertRaisesRegex(RuntimeError,"Checkpoint integrity failure"):
                manager.resume()

        with tempfile.TemporaryDirectory() as tmp:
            manager=mod.ContinuationManager(Path(tmp)); manager.set_task({"id":"radio"})
            manager.checkpoint("P",1,1,{"ok":True})
            state=json.loads(manager.state_path.read_text())
            state["active_task"]["id"]="tampered"
            manager.state_path.write_text(json.dumps(state))
            with self.assertRaisesRegex(RuntimeError,"Active task integrity failure"):
                manager.resume()

if __name__ == "__main__": unittest.main()
